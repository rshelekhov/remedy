import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceAlreadyExistsError } from '../../errors/domain-errors.ts';
import type { FamilyWithMembers } from '../../types/family.types.ts';

export class CreateFamilyUsecase {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Execute create family
   *
   * Flow:
   * 1. Check if user already owns a family
   * 2. If not, create new family with ownerId
   * 3. Return created family data
   */
  async execute(
    request: { name: string; ownerId: string },
    context: { logger: PinoLogger }
  ): Promise<{ family: FamilyWithMembers }> {
    const logger = context.logger.assign({ usecase: 'CreateFamilyUsecase.execute' });

    const existingFamily = await this.prisma.family.findUnique({
      where: { ownerId: request.ownerId },
    });
    if (existingFamily) {
      logger.error({ ownerId: request.ownerId }, 'User already owns a family');
      throw new ResourceAlreadyExistsError('User already owns a family', request.ownerId);
    }

    let family: FamilyWithMembers;
    try {
      family = await this.prisma.family.create({
        data: {
          name: request.name,
          ownerId: request.ownerId,
        },
        include: {
          members: true,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create family');
      throw error;
    }

    return { family };
  }
}
