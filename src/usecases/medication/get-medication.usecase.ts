import type { Medication, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetMedicationUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get medication details
   *
   * Flow:
   * 1. Fetch medication and verify it belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family
   * 3. Return medication data
   */
  async execute(
    request: { userId: string; familyId: string; medicationId: string },
    context: { logger: PinoLogger }
  ): Promise<{ medication: Medication }> {
    const logger = context.logger.assign({ usecase: 'GetMedicationUsecase.execute' });

    // Step 1: Fetch medication and verify it belongs to the requested family
    const medication = await this.authorizationService.fetchAndVerifyMedication(
      request.medicationId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - user must be family owner or any member of the family
    await this.authorizationService.verifyOwnerOrAnyFamilyMember(
      request.userId,
      request.familyId,
      medication.familyMember.family.ownerId,
      'view medications for this family',
      logger
    );

    logger.info(
      { medicationId: medication.id, familyId: request.familyId },
      'Medication retrieved successfully'
    );

    return { medication };
  }
}
