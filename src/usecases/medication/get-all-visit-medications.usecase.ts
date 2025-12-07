import type { Medication, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetAllVisitMedicationsUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get all medications for a visit
   *
   * Flow:
   * 1. Fetch visit and verify it belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family
   * 3. Fetch all medications for the visit
   * 4. Return medications data
   */
  async execute(
    request: { userId: string; familyId: string; visitId: string },
    context: { logger: PinoLogger }
  ): Promise<{ medications: Medication[] }> {
    const logger = context.logger.assign({ usecase: 'GetAllVisitMedicationsUsecase.execute' });

    // Step 1: Fetch visit and verify it belongs to the requested family
    const visit = await this.authorizationService.fetchAndVerifyVisit(
      request.visitId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - user must be family owner or any member of the family
    await this.authorizationService.verifyOwnerOrAnyFamilyMember(
      request.userId,
      request.familyId,
      visit.familyMember.family.ownerId,
      'view medications for this visit',
      logger
    );

    logger.info(
      { familyId: request.familyId, visitId: request.visitId },
      'Fetching all medications for visit'
    );

    // Step 4: Fetch all medications for the visit
    const medications = await this.prisma.medication.findMany({
      where: {
        visitId: request.visitId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info(
      { familyId: request.familyId, visitId: request.visitId, count: medications.length },
      'Visit medications retrieved successfully'
    );

    return { medications };
  }
}
