import type { PinoLogger } from 'hono-pino';
import type { DeviceContext, ISSOService } from '../../infrastructure/ports/sso.port';

export class LogoutUserUsecase {
  constructor(readonly ssoService: ISSOService) {}

  /**
   * Execute logout
   *
   * Flow:
   * 1. Logout with SSO -> invalidate session
   */
  async execute(
    request: {
      accessToken: string;
      deviceContext: DeviceContext;
    },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'LogoutUserUsecase.execute' });

    try {
      await this.ssoService.logout(request.accessToken, request.deviceContext);
    } catch (error) {
      // Make logout idempotent - if session is already gone, treat as success
      // Check for "session not found" error (code 16 = ERROR_CODE_SESSION_NOT_FOUND)
      const errorCode =
        error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      const errorMessage =
        error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;

      if (
        errorCode === '16' ||
        errorMessage.toLowerCase().includes('session not found') ||
        statusCode === 404
      ) {
        logger.info('Session already invalidated, logout is idempotent');
        return;
      }

      logger.error({ err: error }, 'SSO logout failed');
      throw error;
    }
  }
}
