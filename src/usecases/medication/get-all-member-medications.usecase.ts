import type { Medication, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetAllMemberMedicationsUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get all medications for a family member
   *
   * Flow:
   * 1. Verify member exists and belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family
   * 3. Fetch all medications for the member
   * 4. Return medications data
   */
  async execute(
    request: { userId: string; familyId: string; memberId: string },
    context: { logger: PinoLogger }
  ): Promise<{ medications: Medication[] }> {
    const logger = context.logger.assign({ usecase: 'GetAllMemberMedicationsUsecase.execute' });

    // Step 1: Verify member exists and belongs to family
    const member = await this.authorizationService.fetchAndVerifyMember(
      request.memberId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - user must be family owner or any member of the family
    await this.authorizationService.verifyOwnerOrAnyFamilyMember(
      request.userId,
      request.familyId,
      member.family.ownerId,
      'view medications for this family member',
      logger
    );

    logger.info(
      { familyId: request.familyId, memberId: request.memberId },
      'Fetching all medications for member'
    );

    // Step 3: Fetch all medications for the member
    const medications = await this.prisma.medication.findMany({
      where: {
        familyMemberId: request.memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info(
      { familyId: request.familyId, memberId: request.memberId, count: medications.length },
      'Member medications retrieved successfully'
    );

    return { medications };
  }
}
