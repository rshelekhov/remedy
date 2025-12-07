import type { Family, FamilyMember, Medication, PrismaClient, Visit } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError, UnauthorizedOperationError } from '../../errors/domain-errors';

/**
 * Authorization Service
 * Centralizes authorization logic for family-based resources
 */
export class AuthorizationService {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Verify that user is the owner of the family
   * Returns the family if ownership is confirmed
   * Throws ResourceNotFoundError if family not found or user is not the owner
   */
  async verifyFamilyOwnership(
    userId: string,
    familyId: string,
    logger: PinoLogger
  ): Promise<Family> {
    const family = await this.prisma.family.findFirst({
      where: {
        id: familyId,
        ownerId: userId,
      },
    });

    if (!family) {
      logger.error({ familyId, userId }, 'Family not found or user is not the owner');
      throw new ResourceNotFoundError('Family', familyId);
    }

    return family;
  }

  /**
   * Verify that user has access to the family (owner OR any member)
   * Returns the family if access is confirmed
   * Throws ResourceNotFoundError if family not found or user doesn't have access
   */
  async verifyFamilyAccess(userId: string, familyId: string, logger: PinoLogger): Promise<Family> {
    const family = await this.prisma.family.findFirst({
      where: {
        id: familyId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });

    if (!family) {
      logger.error({ familyId, userId }, 'Family not found or access denied');
      throw new ResourceNotFoundError('Family not found or you do not have access to it', familyId);
    }

    return family;
  }

  /**
   * Verify that user is either:
   * - The family owner, OR
   * - The specific family member that the resource belongs to
   *
   * This is the STRICT authorization pattern used for mutations (delete, update)
   */
  async verifyOwnerOrSpecificMember(
    userId: string,
    familyOwnerId: string,
    resourceMemberUserId: string | null,
    operation: string,
    logger: PinoLogger
  ): Promise<void> {
    const isOwner = familyOwnerId === userId;
    const isMember = resourceMemberUserId === userId;

    if (!isOwner && !isMember) {
      logger.error(
        { userId, familyOwnerId, resourceMemberUserId },
        `User is not authorized to ${operation}`
      );
      throw new UnauthorizedOperationError(operation);
    }
  }

  /**
   * Verify that user is either:
   * - The family owner, OR
   * - Any member of the family
   *
   * This is the PERMISSIVE authorization pattern used for reads (get, list)
   */
  async verifyOwnerOrAnyFamilyMember(
    userId: string,
    familyId: string,
    familyOwnerId: string,
    operation: string,
    logger: PinoLogger
  ): Promise<void> {
    const isOwner = familyOwnerId === userId;

    if (!isOwner) {
      // Check if user is any member of the family
      const isFamilyMember = await this.prisma.familyMember.findFirst({
        where: {
          familyId,
          userId,
        },
      });

      if (!isFamilyMember) {
        logger.error({ userId, familyId }, `User is not authorized to ${operation}`);
        throw new UnauthorizedOperationError(operation);
      }
    }
  }

  /**
   * Verify that a resource belongs to the specified family
   * Throws ResourceNotFoundError if resource doesn't belong to family
   */
  verifyResourceBelongsToFamily(
    resourceFamilyId: string,
    requestedFamilyId: string,
    resourceType: string,
    resourceId: string,
    logger: PinoLogger
  ): void {
    if (resourceFamilyId !== requestedFamilyId) {
      logger.error(
        { resourceId, resourceFamilyId, requestedFamilyId },
        `${resourceType} does not belong to this family`
      );
      throw new ResourceNotFoundError(`${resourceType} not found`, resourceId);
    }
  }

  /**
   * Fetch medication with family relations and verify it belongs to the requested family
   * Returns medication with nested familyMember.family
   */
  async fetchAndVerifyMedication(
    medicationId: string,
    familyId: string,
    logger: PinoLogger
  ): Promise<Medication & { familyMember: FamilyMember & { family: Family } }> {
    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId },
      include: {
        familyMember: {
          include: {
            family: true,
          },
        },
      },
    });

    if (!medication) {
      logger.error({ medicationId }, 'Medication not found');
      throw new ResourceNotFoundError('Medication not found', medicationId);
    }

    this.verifyResourceBelongsToFamily(
      medication.familyMember.familyId,
      familyId,
      'Medication',
      medicationId,
      logger
    );

    return medication;
  }

  /**
   * Fetch visit with family relations and verify it belongs to the requested family
   * Returns visit with nested familyMember.family
   */
  async fetchAndVerifyVisit(
    visitId: string,
    familyId: string,
    logger: PinoLogger
  ): Promise<Visit & { familyMember: FamilyMember & { family: Family } }> {
    const visit = await this.prisma.visit.findFirst({
      where: { id: visitId },
      include: {
        familyMember: {
          include: {
            family: true,
          },
        },
      },
    });

    if (!visit) {
      logger.error({ visitId }, 'Visit not found');
      throw new ResourceNotFoundError('Visit not found', visitId);
    }

    this.verifyResourceBelongsToFamily(
      visit.familyMember.familyId,
      familyId,
      'Visit',
      visitId,
      logger
    );

    return visit;
  }

  /**
   * Fetch member with family and verify it belongs to the requested family
   * Returns member with nested family
   */
  async fetchAndVerifyMember(
    memberId: string,
    familyId: string,
    logger: PinoLogger
  ): Promise<FamilyMember & { family: Family }> {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: memberId,
        familyId,
      },
      include: {
        family: true,
      },
    });

    if (!member) {
      logger.error({ memberId, familyId }, 'Member not found or does not belong to family');
      throw new ResourceNotFoundError('Family member not found', memberId);
    }

    return member;
  }
}
