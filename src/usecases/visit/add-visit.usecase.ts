import type { PrismaClient, Visit } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError, UnauthorizedOperationError } from '../../errors/domain-errors';

export class AddVisitUsecase {
  constructor(readonly prisma: PrismaClient) {}

  /**
   * Execute add visit
   *
   * Flow:
   * 1. Verify family exists
   * 2. Verify member exists and belongs to family
   * 3. Verify that userID owns the family or is the member (if provided userId is linked to member)
   * 4. Create new visit record linked to member
   * 5. Return created visit data
   */
  async execute(
    request: {
      familyId: string;
      memberId: string;
      userId: string; // User making the request
      visitDate: string;
      chiefComplaint: string;
      diagnosis?: string | null;
      treatment?: string | null;
      doctorName?: string | null;
      clinicName?: string | null;
      notes?: string | null;
    },
    context: { logger: PinoLogger }
  ): Promise<{ visit: Visit }> {
    const logger = context.logger.assign({ usecase: 'AddVisitUsecase.execute' });

    // Step 1 & 2: Verify member exists and belongs to family
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: request.memberId,
        familyId: request.familyId,
      },
      include: {
        family: true,
      },
    });

    if (!member) {
      logger.error(
        { memberId: request.memberId, familyId: request.familyId },
        'Member not found or does not belong to family'
      );
      throw new ResourceNotFoundError('Family member', request.memberId);
    }

    // Step 3: Verify that userId owns the family or is the member
    const isOwner = member.family.ownerId === request.userId;
    const isMember = member.userId === request.userId;

    if (!isOwner && !isMember) {
      logger.error(
        { userId: request.userId, familyId: request.familyId, memberId: request.memberId },
        'User is not authorized to add visit for this member'
      );
      throw new UnauthorizedOperationError('add visits for this family member');
    }

    logger.info({ familyId: request.familyId, memberId: request.memberId }, 'Adding visit');

    // Step 4: Create new visit record
    let visit: Visit;
    try {
      visit = await this.prisma.visit.create({
        data: {
          familyMemberId: request.memberId,
          visitDate: new Date(request.visitDate),
          chiefComplaint: request.chiefComplaint,
          diagnosis: request.diagnosis,
          treatment: request.treatment,
          doctorName: request.doctorName,
          clinicName: request.clinicName,
          notes: request.notes,
        },
      });

      logger.info({ visitId: visit.id, memberId: request.memberId }, 'Visit added successfully');
    } catch (error) {
      logger.error({ err: error, memberId: request.memberId }, 'Failed to add visit');
      throw error;
    }

    return { visit };
  }
}
