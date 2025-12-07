import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { OwnershipConstraintError, ResourceNotFoundError } from '../../errors/domain-errors';
import type { ISSOService } from '../../infrastructure/ports/sso.port';

export class DeleteUserUsecase {
  constructor(
    readonly ssoService: ISSOService,
    readonly prisma: PrismaClient
  ) {}

  /**
   * Execute delete user account
   *
   * Flow:
   * 1. Verify user exists in local DB
   * 2. Check if user owns a family (ownership constraint)
   * 3. If owns family, throw OwnershipConstraintError
   * 4. Delete account from SSO first
   * 5. Delete user from local DB (cascade deletes FamilyMember records)
   *
   * Note: User must transfer family ownership before deletion
   */
  async execute(
    request: {
      userId: string;
      accessToken: string;
    },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'DeleteUserUsecase.execute' });

    // Step 1: Verify user exists and check ownership
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: { ownedFamily: true },
    });

    if (!user) {
      logger.error({ userId: request.userId }, 'User not found');
      throw new ResourceNotFoundError('User', request.userId);
    }

    // Step 2: Check ownership constraint
    if (user.ownedFamily) {
      logger.error(
        { userId: request.userId, familyId: user.ownedFamily.id },
        'Cannot delete user who owns a family'
      );
      throw new OwnershipConstraintError('a family');
    }

    logger.info({ userId: request.userId }, 'Deleting user account');

    // Step 3: Delete from SSO first
    try {
      await this.ssoService.deleteAccount(request.accessToken);
      logger.info({ userId: request.userId }, 'User deleted from SSO');
    } catch (error) {
      logger.error({ err: error, userId: request.userId }, 'Failed to delete user from SSO');
      throw error;
    }

    // Step 4: Delete from local DB
    // Prisma cascade will automatically delete:
    // - FamilyMember records (where userId = request.userId)
    try {
      await this.prisma.user.delete({
        where: { id: request.userId },
      });
      logger.info({ userId: request.userId }, 'User deleted from local database');
    } catch (error) {
      logger.error(
        { err: error, userId: request.userId },
        'Failed to delete user from database - SSO account already deleted (inconsistent state)'
      );
      throw error;
    }
  }
}
