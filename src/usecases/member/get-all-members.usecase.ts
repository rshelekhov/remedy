import type { FamilyMember, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class GetAllMembersUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute get all members of a family
   *
   * Flow:
   * 1. Verify the family exists and user has access (must be family owner or a member)
   * 2. Fetch all members by familyId from database
   * 3. Return members data
   */
  async execute(
    request: { userId: string; familyId: string },
    context: { logger: PinoLogger }
  ): Promise<{ members: FamilyMember[] }> {
    const logger = context.logger.assign({ usecase: 'GetAllMembersUsecase.execute' });

    // Step 1: Verify the family exists and user has access
    await this.authorizationService.verifyFamilyAccess(request.userId, request.familyId, logger);

    // Step 2: Fetch all members (will always have at least 1)
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: request.familyId },
    });

    return { members };
  }
}
