import type { PrismaClient, Visit } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetVisitUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get visit details
   *
   * Flow:
   * 1. Fetch visit and verify it belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family
   * 3. Return visit data
   */
  async execute(
    request: { userId: string; familyId: string; visitId: string },
    context: { logger: PinoLogger }
  ): Promise<{ visit: Visit }> {
    const logger = context.logger.assign({ usecase: 'GetVisitUsecase.execute' });

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
      'view visits for this family',
      logger
    );

    logger.info({ visitId: visit.id, familyId: request.familyId }, 'Visit retrieved successfully');

    return { visit };
  }
}
