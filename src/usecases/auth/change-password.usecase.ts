import type { PinoLogger } from 'hono-pino';
import type { ISSOService } from '../../infrastructure/ports/sso.port';

export class ChangePasswordUsecase {
  constructor(private readonly ssoService: ISSOService) {}

  /**
   * Execute password change
   *
   * Flow:
   * 1. Change password with SSO using reset token
   * 2. Return success message
   */
  async execute(
    request: {
      token: string;
      password: string;
    },
    context: { logger: PinoLogger }
  ): Promise<{ message: string }> {
    const logger = context.logger.assign({ usecase: 'ChangePasswordUsecase.execute' });

    try {
      await this.ssoService.changePassword(request.token, request.password);
      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error({ err: error }, 'SSO password change failed');
      throw error;
    }
  }
}
