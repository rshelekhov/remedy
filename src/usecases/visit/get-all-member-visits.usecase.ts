import type { PrismaClient, Visit } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetAllMemberVisitsUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get all visits for a family member
   *
   * Flow:
   * 1. Verify member exists and belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family
   * 3. Fetch all visits for the member
   * 4. Return visits data
   */
  async execute(
    request: { userId: string; familyId: string; memberId: string },
    context: { logger: PinoLogger }
  ): Promise<{ visits: Visit[] }> {
    const logger = context.logger.assign({ usecase: 'GetAllMemberVisitsUsecase.execute' });

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
      'view visits for this family member',
      logger
    );

    logger.info(
      { familyId: request.familyId, memberId: request.memberId },
      'Fetching all visits for member'
    );

    // Step 3: Fetch all visits for the member
    const visits = await this.prisma.visit.findMany({
      where: {
        familyMemberId: request.memberId,
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    logger.info(
      { familyId: request.familyId, memberId: request.memberId, count: visits.length },
      'Member visits retrieved successfully'
    );

    return { visits };
  }
}
