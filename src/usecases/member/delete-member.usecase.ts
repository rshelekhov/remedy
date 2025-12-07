import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors';
import type { FileStorageService } from '../../infrastructure/storage';
import { deleteS3FilesGracefully, extractS3KeysFromMember } from '../../infrastructure/storage';

export class DeleteMemberUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute delete member
   *
   * Flow:
   * 1. Verify family exists and belongs to user
   * 2. Verify member exists and belongs to family
   * 3. Fetch all S3 keys from associated File records
   * 4. Delete member from database (cascade deletes visits, files, medications, allergies)
   * 5. Delete S3 files (graceful error handling - log but don't fail request)
   *
   * Note: Prisma's onDelete: Cascade automatically handles:
   * - Visits (through FamilyMembers)
   * - Files (through Visits)
   * - Medications (through FamilyMembers)
   * - Allergies (through FamilyMembers)
   */
  async execute(
    request: { userId: string; familyId: string; memberId: string },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'DeleteMemberUsecase.execute' });

    // Step 1: Verify family exists and belongs to the user
    const family = await this.prisma.family.findFirst({
      where: { id: request.familyId, ownerId: request.userId },
    });

    if (!family) {
      logger.error({ familyId: request.familyId, userId: request.userId }, 'Family not found');
      throw new ResourceNotFoundError('Family', request.familyId);
    }

    // Step 2: Verify member exists and belongs to this family
    // Include visits -> files to get all S3 keys
    const existingMember = await this.prisma.familyMember.findFirst({
      where: { id: request.memberId, familyId: request.familyId },
      include: {
        visits: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!existingMember) {
      logger.error({ memberId: request.memberId, familyId: request.familyId }, 'Member not found');
      throw new ResourceNotFoundError('Family member', request.memberId);
    }

    // Step 3: Extract all S3 keys from File records
    const s3Keys = extractS3KeysFromMember(existingMember);

    logger.info(
      {
        memberId: request.memberId,
        familyId: request.familyId,
        visitsCount: existingMember.visits.length,
        filesCount: s3Keys.length,
      },
      'Deleting member and associated data'
    );

    // Step 4: Delete member from database
    // Prisma cascade will automatically delete:
    // - Visits (through member)
    // - Files (through visits) - DB records only
    // - Medications (through member)
    // - Allergies (through member)
    try {
      await this.prisma.familyMember.delete({
        where: { id: request.memberId },
      });

      logger.info({ memberId: request.memberId }, 'Member deleted from database');
    } catch (error) {
      logger.error({ err: error, memberId: request.memberId }, 'Failed to delete member');
      throw error;
    }

    // Step 5: Delete S3 files gracefully
    await deleteS3FilesGracefully(s3Keys, this.fileStorageService, logger, {
      entityType: 'memberId',
      entityId: request.memberId,
    });
  }
}
