import type { FamilyMember, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetMemberUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get member details
   *
   * Flow:
   * 1. Verify member exists and belongs to the requested family
   * 2. Verify that userId is family owner or any member of the family
   * 3. Return member data
   */
  async execute(
    request: { userId: string; familyId: string; memberId: string },
    context: { logger: PinoLogger }
  ): Promise<{ member: FamilyMember }> {
    const logger = context.logger.assign({ usecase: 'GetMemberUsecase.execute' });

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
      'view this family member',
      logger
    );

    return { member };
  }
}
