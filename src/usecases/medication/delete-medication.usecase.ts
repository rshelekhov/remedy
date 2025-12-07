import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class DeleteMedicationUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute delete medication
   *
   * Flow:
   * 1. Fetch medication and verify it belongs to the requested family
   * 2. Verify that userId is family owner OR the specific member the medication belongs to
   * 3. Delete medication from database
   * 4. Return success
   */
  async execute(
    request: {
      userId: string;
      familyId: string;
      medicationId: string;
    },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'DeleteMedicationUsecase.execute' });

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
      'delete this medication',
      logger
    );

    logger.info(
      { medicationId: request.medicationId, familyId: request.familyId },
      'Deleting medication'
    );

    // Step 3: Delete medication from database
    await this.prisma.medication.delete({
      where: { id: request.medicationId },
    });

    logger.info({ medicationId: request.medicationId }, 'Medication deleted successfully');
  }
}
