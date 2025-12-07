import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors.ts';
import type { FamilyWithMembers } from '../../types/family.types.ts';

export class GetFamilyUsecase {
  constructor(readonly prisma: PrismaClient) {}
  /**
   * Execute get family details
   *
   * Flow:
   * 1. Fetch family by ID from database
   * 2. If not found, throw ResourceNotFoundError
   * 3. Return family data
   */
  async execute(
    request: { userId: string; familyId: string },
    context: { logger: PinoLogger }
  ): Promise<{ family: FamilyWithMembers }> {
    const logger = context.logger.assign({ usecase: 'GetFamilyUsecase.execute' });

    let family: FamilyWithMembers | null;
    try {
      family = await this.prisma.family.findFirst({
        where: {
          id: request.familyId,
          ownerId: request.userId,
        },
        include: {
          members: true,
        },
      });

      if (!family) {
        logger.error({ familyId: request.familyId, userId: request.userId }, 'Family not found');
        throw new ResourceNotFoundError('Family not found', request.familyId);
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to get family details');
      throw error;
    }

    return { family };
  }
}
