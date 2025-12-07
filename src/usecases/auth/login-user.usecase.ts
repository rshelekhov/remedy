import type { PrismaClient } from '@prisma/client';
import { SSOError } from '@rshelekhov/sso-sdk';
import type { PinoLogger } from 'hono-pino';
import { InvalidCredentialsError } from '../../errors/domain-errors';
import type { AuthTokens, DeviceContext, ISSOService } from '../../infrastructure/ports/sso.port';

export class LoginUserUsecase {
  constructor(
    readonly ssoService: ISSOService,
    readonly prisma: PrismaClient
  ) {}

  /**
   * Execute login
   *
   * Flow:
   * 1. Login with SSO -> get tokens
   * 2. Return tokens
   *
   * Security: Normalize "user not found" errors to InvalidCredentialsError
   * to avoid revealing if email exists in the system
   */
  async execute(
    request: {
      email: string;
      password: string;
      deviceContext: DeviceContext;
    },
    context: { logger: PinoLogger }
  ): Promise<{ tokens: AuthTokens }> {
    const logger = context.logger.assign({ usecase: 'LoginUserUsecase.execute' });

    let tokens: AuthTokens;

    try {
      tokens = await this.ssoService.login(request.email, request.password, request.deviceContext);
    } catch (error) {
      // Security: normalize user not found to invalid credentials
      // Don't reveal whether email exists in the system
      if (error instanceof SSOError && error.statusCode === 404) {
        logger.error({ err: error }, 'User not found during login');
        throw new InvalidCredentialsError();
      }

      logger.error({ err: error }, 'SSO login failed');
      throw error;
    }

    return { tokens };
  }
}
