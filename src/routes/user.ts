import { OpenAPIHono } from '@hono/zod-openapi';
import { mapErrorToHttp } from '../errors/error-mapper';
import {
  deleteUserUsecase,
  forceDeleteUserUsecase,
  getUserProfileUsecase,
  logoutUserUsecase,
} from '../infrastructure/container';
import { extractDeviceContext } from '../lib/device-context';
import type { AppVariables } from '../types/hono.types';
import {
  deleteUserAccountRoute,
  forceDeleteUserRoute,
  getUserProfileRoute,
  logoutRoute,
} from './openapi/user.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * Get User Profile
   */
  .openapi(getUserProfileRoute, async (c) => {
    const logger = c.var.logger;
    const accessToken = c.get('ssoToken');

    try {
      const result = await getUserProfileUsecase.execute({ accessToken }, { logger });

      logger.info({ userId: result.profile.id }, 'User profile retrieved successfully');

      return c.json({ data: { profile: result.profile } }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Failed to retrieve user profile');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 401
      );
    }
  })
  /**
   * Logout User
   */
  .openapi(logoutRoute, async (c) => {
    const logger = c.var.logger;
    const accessToken = c.get('ssoToken');

    try {
      const deviceContext = extractDeviceContext(c);
      await logoutUserUsecase.execute({ accessToken, deviceContext }, { logger });

      logger.info('User logged out successfully');

      return c.json({ message: 'User logged out successfully' }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Logout failed');
      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 401
      );
    }
  })
  /**
   * Delete User Account
   */
  .openapi(deleteUserAccountRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const accessToken = c.get('ssoToken');

    try {
      await deleteUserUsecase.execute({ userId, accessToken }, { logger });

      logger.info({ userId }, 'User account deleted successfully');

      return c.json({ message: 'Account deleted successfully' }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error({ err: error, errorCode: httpError.code }, 'Failed to delete user account');

      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 401 | 409 | 500
      );
    }
  })
  /**
   * Force Delete User Account
   */
  .openapi(forceDeleteUserRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const accessToken = c.get('ssoToken');

    try {
      const result = await forceDeleteUserUsecase.execute({ userId, accessToken }, { logger });

      logger.info({ userId }, 'User account force deleted successfully');

      return c.json({ message: result.message }, 200);
    } catch (error) {
      const httpError = mapErrorToHttp(error);
      logger.error(
        { err: error, errorCode: httpError.code },
        'Failed to force delete user account'
      );

      return c.json(
        { error: httpError.message, code: httpError.code, details: httpError.details },
        httpError.statusCode as 401 | 500
      );
    }
  });

export default router;
