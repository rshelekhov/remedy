import type { FamilyMember, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceAlreadyExistsError, ResourceNotFoundError } from '../../errors/domain-errors';

export class AddMemberUsecase {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Execute add family member
   *
   * Flow:
   * 1. Verify family exists and user owns it
   * 2. If memberUserId provided, check if that user already exists as member in this family
   * 3. Create new family member
   * 4. Return created member data
   *
   * Note: Members can exist without memberUserId (non-user family members like children)
   * The unique constraint only applies when memberUserId is provided
   */
  async execute(
    request: {
      familyId: string;
      ownerId: string; // User making the request (must own the family)
      name: string;
      dateOfBirth?: string | null;
      gender?: string | null;
      relationship?: string | null;
      memberUserId?: string | null; // Optional userId to link member to a user account
    },
    context: { logger: PinoLogger }
  ): Promise<{ member: FamilyMember }> {
    const logger = context.logger.assign({ usecase: 'AddMemberUsecase.execute' });

    // Step 1: Verify family exists and user owns it
    const family = await this.prisma.family.findFirst({
      where: {
        id: request.familyId,
        ownerId: request.ownerId,
      },
    });

    if (!family) {
      logger.error(
        { familyId: request.familyId, ownerId: request.ownerId },
        'Family not found or user is not the owner'
      );
      throw new ResourceNotFoundError('Family', request.familyId);
    }

    // Step 2: If memberUserId provided, check if that user already exists as member in this family
    if (request.memberUserId) {
      const existingMember = await this.prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: request.familyId,
            userId: request.memberUserId,
          },
        },
      });

      if (existingMember) {
        logger.error(
          { familyId: request.familyId, memberUserId: request.memberUserId },
          'User is already a member of this family'
        );
        throw new ResourceAlreadyExistsError('Family member', request.memberUserId);
      }
    }

    logger.info({ familyId: request.familyId }, 'Adding family member');

    // Step 3: Create family member
    let member: FamilyMember;
    try {
      member = await this.prisma.familyMember.create({
        data: {
          familyId: request.familyId,
          name: request.name,
          dateOfBirth: request.dateOfBirth ? new Date(request.dateOfBirth) : null,
          gender: request.gender,
          relationship: request.relationship,
          userId: request.memberUserId,
        },
      });

      logger.info(
        { memberId: member.id, familyId: request.familyId },
        'Family member added successfully'
      );
    } catch (error) {
      logger.error({ err: error, familyId: request.familyId }, 'Failed to add family member');
      throw error;
    }

    return { member };
  }
}
