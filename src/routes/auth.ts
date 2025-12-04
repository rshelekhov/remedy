import { OpenAPIHono } from '@hono/zod-openapi';
import { mapErrorToHttp } from '../errors/error-mapper';
import {
  changePasswordUsecase,
  loginUserUseCase,
  refreshTokensUsecase,
  registerUserUsecase,
  requestPasswordResetUsecase,
  verifyEmailUsecase,
} from '../infrastructure/container';
import { extractDeviceContext } from '../lib/device-context';
import type { AppVariables } from '../types/hono.types';
import {
  changePasswordRoute,
  loginRoute,
  refreshTokensRoute,
  registerRoute,
  requestPasswordResetRoute,
  verifyEmailRoute,
} from './openapi/auth.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * Register User
   **/
  .openapi(registerRoute, async (c) => {
    const logger = c.var.logger;
    const { email, password, name } = c.req.valid('json');

    try {
      const deviceContext = extractDeviceContext(c);
      const result = await registerUserUsecase.execute(
        { email, password, name, deviceContext },
        { logger }
      );

      logger.info({ userId: result.user.id }, 'User registered successfully');

      return c.json(
        {
          message: 'User registered successfully',
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
            },
            tokens: result.tokens,
          },
        },
        201
      );
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Registration failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 400 | 409
      );
    }
  })
  /**
   * Login User
   */
  .openapi(loginRoute, async (c) => {
    const logger = c.var.logger;
    const { email, password } = c.req.valid('json');

    try {
      const deviceContext = extractDeviceContext(c);
      const result = await loginUserUseCase.execute({ email, password, deviceContext }, { logger });

      logger.info('User logged in successfully');

      return c.json(
        { message: 'User logged in successfully', data: { tokens: result.tokens } },
        200
      );
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Login failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 401
      );
    }
  })
  /**
   * Verify Email
   */
  .openapi(verifyEmailRoute, async (c) => {
    const logger = c.var.logger;
    const { token } = c.req.valid('query');

    try {
      const result = await verifyEmailUsecase.execute({ token }, { logger });
      logger.info({ token }, 'Email verified successfully');
      return c.json({ message: result.message }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Email verification failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 400
      );
    }
  })
  /**
   * Password Reset Request
   */
  .openapi(requestPasswordResetRoute, async (c) => {
    const logger = c.var.logger;
    const { email } = c.req.valid('json');

    try {
      const result = await requestPasswordResetUsecase.execute({ email }, { logger });
      logger.info({ email }, 'Password reset email sent');
      return c.json({ message: result.message }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Password reset request failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 404
      );
    }
  })
  /**
   * Change Password
   */
  .openapi(changePasswordRoute, async (c) => {
    const logger = c.var.logger;
    const { token, password } = c.req.valid('json');

    try {
      const result = await changePasswordUsecase.execute({ token, password }, { logger });
      logger.info('Password changed successfully');
      return c.json({ message: result.message }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Password change failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 400
      );
    }
  })
  /**
   * Refresh Tokens
   */
  .openapi(refreshTokensRoute, async (c) => {
    const logger = c.var.logger;
    const { refreshToken } = c.req.valid('json');

    try {
      const deviceContext = extractDeviceContext(c);
      const result = await refreshTokensUsecase.execute(
        { refreshToken, deviceContext },
        { logger }
      );

      logger.info('Tokens refreshed successfully');

      return c.json(
        { message: 'Tokens refreshed successfully', data: { tokens: result.tokens } },
        200
      );
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Token refresh failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 401
      );
    }
  });

export default router;
