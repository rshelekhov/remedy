import type { File, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

/**
 * List Visit Files Use Case
 * Lists all files attached to a specific visit
 */
export class ListVisitFilesUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute list visit files
   *
   * Flow:
   * 1. Fetch visit and verify it belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family (PERMISSIVE)
   * 3. Fetch all files for the visit
   * 4. Return files array
   */
  async execute(
    request: { userId: string; familyId: string; visitId: string },
    context: { logger: PinoLogger }
  ): Promise<{ files: File[] }> {
    const logger = context.logger.assign({ usecase: 'ListVisitFilesUsecase.execute' });

    // Step 1: Fetch visit and verify it belongs to the requested family
    const visit = await this.authorizationService.fetchAndVerifyVisit(
      request.visitId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - PERMISSIVE (any family member can view)
    await this.authorizationService.verifyOwnerOrAnyFamilyMember(
      request.userId,
      request.familyId,
      visit.familyMember.family.ownerId,
      'view files for this visit',
      logger
    );

    // Step 3: Fetch all files for the visit
    const files = await this.prisma.file.findMany({
      where: { visitId: request.visitId },
      orderBy: { uploadedAt: 'desc' },
    });

    logger.info(
      { visitId: request.visitId, filesCount: files.length },
      'Visit files retrieved successfully'
    );

    return { files };
  }
}
