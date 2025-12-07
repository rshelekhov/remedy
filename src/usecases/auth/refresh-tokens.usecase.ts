import type { PinoLogger } from 'hono-pino';
import type { AuthTokens, DeviceContext, ISSOService } from '../../infrastructure/ports/sso.port';

export class RefreshTokensUsecase {
  constructor(private readonly ssoService: ISSOService) {}

  /**
   * Execute token refresh
   *
   * Flow:
   * 1. Refresh tokens with SSO using refresh token
   * 2. Return new tokens
   */
  async execute(
    request: {
      refreshToken: string;
      deviceContext: DeviceContext;
    },
    context: { logger: PinoLogger }
  ): Promise<{ tokens: AuthTokens }> {
    const logger = context.logger.assign({ usecase: 'RefreshTokensUsecase.execute' });

    let tokens: AuthTokens;

    try {
      tokens = await this.ssoService.refreshTokens(request.refreshToken, request.deviceContext);
    } catch (error) {
      logger.error({ err: error }, 'SSO token refresh failed');
      throw error;
    }

    return { tokens };
  }
}
