import type { PrismaClient, User } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthTokens, DeviceContext, ISSOService } from '../../infrastructure/ports/sso.port';

export class RegisterUserUsecase {
  constructor(
    private readonly ssoService: ISSOService,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Execute registration
   *
   * Flow:
   * 1. Register with SSO -> get userId + tokens
   * 2. Save user to local DB
   * 3. Return user + tokens
   */
  async execute(
    request: {
      email: string;
      password: string;
      name: string;
      deviceContext: DeviceContext;
    },
    context: { logger: PinoLogger }
  ): Promise<{
    user: User;
    tokens: AuthTokens;
  }> {
    const logger = context.logger.assign({ usecase: 'RegisterUserUsecase.execute' });

    let userId: string;
    let tokens: AuthTokens;

    try {
      const result = await this.ssoService.register(
        request.email,
        request.password,
        request.name,
        request.deviceContext
      );
      userId = result.userId;
      tokens = result.tokens;
    } catch (error) {
      logger.error({ err: error }, 'SSO registration failed');
      throw error;
    }

    let user: User;

    try {
      user = await this.prisma.user.create({
        data: {
          id: userId,
          email: request.email,
          name: request.name,
        },
      });
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to save user to database');
      throw error;
    }

    return { user, tokens };
  }
}
