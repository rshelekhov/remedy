import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors';
import type { ISSOService } from '../../infrastructure/ports/sso.port';
import type { FileStorageService } from '../../infrastructure/storage';

export class ForceDeleteUserUsecase {
  constructor(
    readonly ssoService: ISSOService,
    readonly prisma: PrismaClient,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute force delete user
   *
   * Flow:
   * 1. Verify user exists
   * 2. Fetch user's owned family (if any)
   * 3. Extract all S3 keys from File records
   * 4. Delete account from SSO first
   * 5. Delete user from DB (cascade deletes everything: family, members, visits, files, etc.)
   * 6. Delete S3 files (graceful error handling)
   *
   * Cascade chain:
   * User -> Family -> FamilyMember -> Visit -> File
   *                 -> Medication
   *                 -> Allergy
   *
   * Note: This bypasses ownership constraint and deletes all related data
   */
  async execute(
    request: {
      userId: string;
      accessToken: string;
    },
    context: { logger: PinoLogger }
  ): Promise<{ message: string }> {
    const logger = context.logger.assign({ usecase: 'ForceDeleteUserUsecase.execute' });

    // Step 1: Fetch user with owned family
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: { ownedFamily: true },
    });

    if (!user) {
      logger.error({ userId: request.userId }, 'User not found');
      throw new ResourceNotFoundError('User', request.userId);
    }

    // Step 2: Extract all S3 keys if user owns a family
    const s3Keys: string[] = [];
    if (user.ownedFamily) {
      // Query files directly with a filter - much cleaner!
      const files = await this.prisma.file.findMany({
        where: {
          visit: {
            familyMember: {
              familyId: user.ownedFamily.id,
            },
          },
        },
        select: { s3Key: true },
      });

      s3Keys.push(...files.map((f) => f.s3Key));
    }

    logger.info(
      {
        userId: request.userId,
        hasFamily: !!user.ownedFamily,
        familyId: user.ownedFamily?.id,
        filesCount: s3Keys.length,
      },
      'Force deleting user and all associated data'
    );

    // Step 3: Delete from SSO first
    try {
      await this.ssoService.deleteAccount(request.accessToken);
      logger.info({ userId: request.userId }, 'User deleted from SSO');
    } catch (error) {
      logger.error({ err: error, userId: request.userId }, 'Failed to delete user from SSO');
      throw error;
    }

    // Step 4: Delete user from database
    // Prisma cascade (onDelete: Cascade) will automatically delete:
    // - Family (via ownerId relation)
    //   - FamilyMembers (via familyId relation)
    //     - Visits (via familyMemberId relation)
    //       - Files (via visitId relation)
    //     - Medications (via familyMemberId relation)
    //     - Allergies (via familyMemberId relation)
    // - FamilyMember records where this user is linked (via userId relation)
    try {
      await this.prisma.user.delete({
        where: { id: request.userId },
      });
      logger.info({ userId: request.userId }, 'User and all cascaded data deleted from database');
    } catch (error) {
      logger.error(
        { err: error, userId: request.userId },
        'Failed to delete user from database - SSO account already deleted (inconsistent state)'
      );
      throw error;
    }

    // Step 5: Delete S3 files
    // Handle errors gracefully - if S3 deletion fails, we still consider the operation successful
    // because the database (source of truth) has been cleaned up
    if (s3Keys.length > 0) {
      try {
        await this.fileStorageService.deleteFiles(s3Keys);
        logger.info(
          { userId: request.userId, filesDeleted: s3Keys.length },
          'S3 files deleted successfully'
        );
      } catch (error) {
        // Log error but don't fail the request
        logger.error(
          {
            err: error,
            userId: request.userId,
            s3Keys,
          },
          'Failed to delete S3 files - files may be orphaned. Consider running a cleanup job.'
        );
        // Don't throw - the operation is still considered successful
      }
    } else {
      logger.info({ userId: request.userId }, 'No files to delete from S3');
    }

    return {
      message: 'Account and all associated data forcefully deleted',
    };
  }
}
