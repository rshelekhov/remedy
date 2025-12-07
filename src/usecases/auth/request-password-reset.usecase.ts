import type { PinoLogger } from 'hono-pino';
import type { ISSOService } from '../../infrastructure/ports/sso.port';

export class RequestPasswordResetUsecase {
  constructor(private readonly ssoService: ISSOService) {}

  /**
   * Execute password reset request
   *
   * Flow:
   * 1. Request password reset email from SSO
   * 2. Return success message
   */
  async execute(
    request: {
      email: string;
    },
    context: { logger: PinoLogger }
  ): Promise<{ message: string }> {
    const logger = context.logger.assign({ usecase: 'RequestPasswordResetUsecase.execute' });

    try {
      await this.ssoService.requestPasswordReset(request.email);
      return { message: 'Password reset email sent' };
    } catch (error) {
      logger.error({ err: error }, 'SSO password reset request failed');
      throw error;
    }
  }
}
