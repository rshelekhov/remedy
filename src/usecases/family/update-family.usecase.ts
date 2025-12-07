import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors.ts';
import type { FamilyWithMembers } from '../../types/family.types';

export class UpdateFamilyUsecase {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Execute update family
   *
   * Flow:
   * 1. Update family details
   * 2. Return updated family data
   */
  async execute(
    request: { userId: string; familyId: string; name: string },
    context: { logger: PinoLogger }
  ): Promise<{ family: FamilyWithMembers }> {
    const logger = context.logger.assign({ usecase: 'UpdateFamilyUsecase.execute' });

    try {
      const family = await this.prisma.family.update({
        where: {
          id: request.familyId,
          ownerId: request.userId,
        },
        data: {
          name: request.name,
        },
        include: {
          members: true,
        },
      });

      return { family };
    } catch (error) {
      // Handle Prisma P2025 error (record not found)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        logger.error({ familyId: request.familyId, userId: request.userId }, 'Family not found');
        throw new ResourceNotFoundError('Family', request.familyId);
      }

      logger.error({ err: error }, 'Failed to update family');
      throw error;
    }
  }
}
