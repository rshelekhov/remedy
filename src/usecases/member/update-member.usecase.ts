import type { FamilyMember, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceAlreadyExistsError, ResourceNotFoundError } from '../../errors/domain-errors';

export class UpdateMemberUsecase {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Execute update member
   *
   * Flow:
   * 1. Verify family exists and belongs to user
   * 2. Verify member exists and belongs to family
   * 3. If updating userId, check for conflicts
   * 4. Update member in database
   */
  async execute(
    request: {
      userId: string;
      familyId: string;
      memberId: string;
      name?: string;
      dateOfBirth?: string | null;
      gender?: string | null;
      relationship?: string | null;
      memberUserId?: string | null;
    },
    context: { logger: PinoLogger }
  ): Promise<{ member: FamilyMember }> {
    const logger = context.logger.assign({ usecase: 'UpdateMemberUsecase.execute' });

    // Verify family exists and user owns it
    const family = await this.prisma.family.findFirst({
      where: { id: request.familyId, ownerId: request.userId },
    });

    if (!family) {
      logger.error({ familyId: request.familyId, userId: request.userId }, 'Family not found');
      throw new ResourceNotFoundError('Family', request.familyId);
    }

    // Verify member exists and belongs to this family
    const existingMember = await this.prisma.familyMember.findFirst({
      where: { id: request.memberId, familyId: request.familyId },
    });

    if (!existingMember) {
      logger.error({ memberId: request.memberId, familyId: request.familyId }, 'Member not found');
      throw new ResourceNotFoundError('Family member', request.memberId);
    }

    // If updating userId, check for conflicts
    if (
      request.memberUserId !== undefined &&
      request.memberUserId !== existingMember.userId &&
      request.memberUserId !== null
    ) {
      const conflictingMember = await this.prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: request.familyId,
            userId: request.memberUserId,
          },
        },
      });

      if (conflictingMember) {
        logger.error({ memberUserId: request.memberUserId }, 'UserId already exists in family');
        throw new ResourceAlreadyExistsError('Family member with userId', request.memberUserId);
      }
    }

    // Build update data with only provided fields
    const updateData: {
      name?: string;
      dateOfBirth?: Date | null;
      gender?: string | null;
      relationship?: string | null;
      userId?: string | null;
    } = {};

    if (request.name !== undefined) {
      updateData.name = request.name;
    }
    if (request.dateOfBirth !== undefined) {
      updateData.dateOfBirth = request.dateOfBirth ? new Date(request.dateOfBirth) : null;
    }
    if (request.gender !== undefined) {
      updateData.gender = request.gender;
    }
    if (request.relationship !== undefined) {
      updateData.relationship = request.relationship;
    }
    if (request.memberUserId !== undefined) {
      updateData.userId = request.memberUserId;
    }

    const member = await this.prisma.familyMember.update({
      where: { id: request.memberId },
      data: updateData,
    });

    logger.info({ memberId: member.id }, 'Member updated successfully');
    return { member };
  }
}
