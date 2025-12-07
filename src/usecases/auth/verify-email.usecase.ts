import type { PinoLogger } from 'hono-pino';
import type { ISSOService } from '../../infrastructure/ports/sso.port';

export class VerifyEmailUsecase {
  constructor(private readonly ssoService: ISSOService) {}

  /**
   * Execute email verification
   *
   * Flow:
   * 1. Verify email with SSO using token
   * 2. Return success message
   */
  async execute(
    request: {
      token: string;
    },
    context: { logger: PinoLogger }
  ): Promise<{ message: string }> {
    const logger = context.logger.assign({ usecase: 'VerifyEmailUsecase.execute' });

    try {
      await this.ssoService.verifyEmail(request.token);
      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error({ err: error }, 'SSO email verification failed');
      throw error;
    }
  }
}
