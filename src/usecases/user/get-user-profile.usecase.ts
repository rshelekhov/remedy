import type { PinoLogger } from 'hono-pino';
import type { ISSOService, UserProfile } from '../../infrastructure/ports/sso.port';

export class GetUserProfileUsecase {
  constructor(readonly ssoService: ISSOService) {}

  /**
   * Execute get user profile
   *
   * Flow:
   * 1. Get user profile from SSO
   * 2. Return profile data
   */
  async execute(
    request: {
      accessToken: string;
    },
    context: { logger: PinoLogger }
  ): Promise<{ profile: UserProfile }> {
    const logger = context.logger.assign({ usecase: 'GetUserProfileUsecase.execute' });

    let profile: UserProfile;

    try {
      profile = await this.ssoService.getProfile(request.accessToken);
    } catch (error) {
      logger.error({ err: error }, 'SSO get profile failed');
      throw error;
    }

    return { profile };
  }
}
