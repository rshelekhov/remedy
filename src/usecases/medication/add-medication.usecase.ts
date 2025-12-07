import type { Medication, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class AddMedicationUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute add medication
   *
   * Flow:
   * 1. Verify member exists and belongs to family
   * 2. Verify that userId owns the family or is the member
   * 3. If visitId is provided, verify visit exists and belongs to the member
   * 4. Create new medication record linked to member
   * 5. Return created medication data
   */
  async execute(
    request: {
      familyId: string;
      memberId: string;
      userId: string; // User making the request
      visitId?: string | null;
      name: string;
      dosage?: string | null;
      frequency?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      prescribingDoctor?: string | null;
      notes?: string | null;
      isActive?: boolean;
    },
    context: { logger: PinoLogger }
  ): Promise<{ medication: Medication }> {
    const logger = context.logger.assign({ usecase: 'AddMedicationUsecase.execute' });

    // Step 1: Verify member exists and belongs to family
    const member = await this.authorizationService.fetchAndVerifyMember(
      request.memberId,
      request.familyId,
      logger
    );

    // Step 2: Verify that userId owns the family or is the member
    await this.authorizationService.verifyOwnerOrSpecificMember(
      request.userId,
      member.family.ownerId,
      member.userId,
      'add medications for this family member',
      logger
    );

    // Step 3: If visitId is provided, verify visit exists and belongs to the member
    if (request.visitId) {
      const visit = await this.prisma.visit.findFirst({
        where: {
          id: request.visitId,
          familyMemberId: request.memberId,
        },
      });

      if (!visit) {
        logger.error(
          { visitId: request.visitId, memberId: request.memberId },
          'Visit not found or does not belong to member'
        );
        throw new ResourceNotFoundError('Visit', request.visitId);
      }
    }

    logger.info({ familyId: request.familyId, memberId: request.memberId }, 'Adding medication');

    // Step 5: Create new medication record
    let medication: Medication;
    try {
      medication = await this.prisma.medication.create({
        data: {
          familyMemberId: request.memberId,
          visitId: request.visitId,
          name: request.name,
          dosage: request.dosage,
          frequency: request.frequency,
          startDate: request.startDate ? new Date(request.startDate) : null,
          endDate: request.endDate ? new Date(request.endDate) : null,
          prescribingDoctor: request.prescribingDoctor,
          notes: request.notes,
          isActive: request.isActive ?? true,
        },
      });

      logger.info(
        { medicationId: medication.id, memberId: request.memberId },
        'Medication added successfully'
      );
    } catch (error) {
      logger.error({ err: error, memberId: request.memberId }, 'Failed to add medication');
      throw error;
    }

    return { medication };
  }
}
