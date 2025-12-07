import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { InvalidOwnerError, ResourceNotFoundError } from '../../errors/domain-errors';
import type { FamilyWithMembers } from '../../types/family.types';

export class TransferOwnershipUsecase {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Execute transfer family ownership
   *
   * Flow:
   * 1. Verify family exists and current user is the owner
   * 2. Verify new owner exists as a FamilyMember with a linked userId
   * 3. Verify new owner has a User account
   * 4. Verify new owner doesn't already own a different family (MVP constraint)
   * 5. Update ownerId in Family table atomically
   * 6. Return updated family
   *
   * Business Rules:
   * - Only current owner can transfer ownership
   * - New owner must be an existing FamilyMember in the family
   * - New owner must have a linked userId (User account)
   * - New owner cannot already own a different family (MVP: one family per user)
   * - Old owner remains as a FamilyMember after transfer
   */
  async execute(
    request: {
      currentOwnerId: string;
      familyId: string;
      newOwnerId: string;
    },
    context: { logger: PinoLogger }
  ): Promise<{ family: FamilyWithMembers }> {
    const logger = context.logger.assign({ usecase: 'TransferOwnershipUsecase.execute' });

    // Step 1: Verify family exists and current user is the owner
    const family = await this.prisma.family.findFirst({
      where: {
        id: request.familyId,
        ownerId: request.currentOwnerId,
      },
      include: {
        members: true,
      },
    });

    if (!family) {
      logger.error(
        { familyId: request.familyId, currentOwnerId: request.currentOwnerId },
        'Family not found or user is not the owner'
      );
      throw new ResourceNotFoundError('Family', request.familyId);
    }

    // Step 2: Verify new owner is a FamilyMember in this family with a linked userId
    const newOwnerMember = family.members.find((member) => member.userId === request.newOwnerId);

    if (!newOwnerMember) {
      logger.error(
        {
          familyId: request.familyId,
          newOwnerId: request.newOwnerId,
        },
        'New owner is not a member of this family with a linked user account'
      );
      throw new InvalidOwnerError(
        'New owner must be an existing family member with a linked user account'
      );
    }

    // Step 3: Verify new owner User exists
    const newOwnerUser = await this.prisma.user.findUnique({
      where: { id: request.newOwnerId },
      include: { ownedFamily: true },
    });

    if (!newOwnerUser) {
      logger.error({ newOwnerId: request.newOwnerId }, 'New owner user account not found');
      throw new InvalidOwnerError('User account not found');
    }

    // Step 4: Verify new owner doesn't already own a different family (MVP constraint)
    if (newOwnerUser.ownedFamily && newOwnerUser.ownedFamily.id !== request.familyId) {
      logger.error(
        {
          newOwnerId: request.newOwnerId,
          existingFamilyId: newOwnerUser.ownedFamily.id,
          requestedFamilyId: request.familyId,
        },
        'New owner already owns a different family'
      );
      throw new InvalidOwnerError('User already owns a different family');
    }

    logger.info(
      {
        familyId: request.familyId,
        currentOwnerId: request.currentOwnerId,
        newOwnerId: request.newOwnerId,
      },
      'Transferring family ownership'
    );

    // Step 5: Update ownership atomically
    let updatedFamily: FamilyWithMembers;
    try {
      updatedFamily = await this.prisma.family.update({
        where: { id: request.familyId },
        data: {
          ownerId: request.newOwnerId,
        },
        include: {
          members: true,
        },
      });

      logger.info(
        {
          familyId: request.familyId,
          newOwnerId: request.newOwnerId,
        },
        'Family ownership transferred successfully'
      );
    } catch (error) {
      logger.error(
        { err: error, familyId: request.familyId },
        'Failed to transfer family ownership'
      );
      throw error;
    }

    return { family: updatedFamily };
  }
}
