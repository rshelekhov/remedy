import type { Medication, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class UpdateMedicationUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute update medication
   *
   * Flow:
   * 1. Fetch medication and verify it belongs to the requested family
   * 2. Verify that userId is family owner OR the specific member the medication belongs to
   * 3. Update medication with provided fields
   * 4. Return updated medication data
   */
  async execute(
    request: {
      userId: string;
      familyId: string;
      medicationId: string;
      name?: string;
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
    const logger = context.logger.assign({ usecase: 'UpdateMedicationUsecase.execute' });

    // Step 1: Fetch medication and verify it belongs to the requested family
    const medication = await this.authorizationService.fetchAndVerifyMedication(
      request.medicationId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - user must be family owner OR the specific member
    await this.authorizationService.verifyOwnerOrSpecificMember(
      request.userId,
      medication.familyMember.family.ownerId,
      medication.familyMember.userId,
      'update this medication',
      logger
    );

    logger.info(
      { medicationId: request.medicationId, familyId: request.familyId },
      'Updating medication'
    );

    // Step 4: Build update data with only provided fields
    const updateData: {
      name?: string;
      dosage?: string | null;
      frequency?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      prescribingDoctor?: string | null;
      notes?: string | null;
      isActive?: boolean;
    } = {};

    if (request.name !== undefined) {
      updateData.name = request.name;
    }
    if (request.dosage !== undefined) {
      updateData.dosage = request.dosage;
    }
    if (request.frequency !== undefined) {
      updateData.frequency = request.frequency;
    }
    if (request.startDate !== undefined) {
      updateData.startDate = request.startDate ? new Date(request.startDate) : null;
    }
    if (request.endDate !== undefined) {
      updateData.endDate = request.endDate ? new Date(request.endDate) : null;
    }
    if (request.prescribingDoctor !== undefined) {
      updateData.prescribingDoctor = request.prescribingDoctor;
    }
    if (request.notes !== undefined) {
      updateData.notes = request.notes;
    }
    if (request.isActive !== undefined) {
      updateData.isActive = request.isActive;
    }

    // Step 5: Update medication in database
    const updatedMedication = await this.prisma.medication.update({
      where: { id: request.medicationId },
      data: updateData,
    });

    logger.info({ medicationId: updatedMedication.id }, 'Medication updated successfully');

    return { medication: updatedMedication };
  }
}
