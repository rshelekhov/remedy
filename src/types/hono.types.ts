/**
 * Hono Context Type Definitions
 *
 * Extends Hono's context with custom variables for JWT authentication and logging
 */

import type { JWTClaims } from '@rshelekhov/sso-sdk';
import type { PinoLogger } from 'hono-pino';

/**
 * Custom variables available in Hono context
 */
export type AppVariables = {
  /**
   * Pino logger instance from hono-pino middleware
   * Available after pinoLogger middleware
   */
  logger: PinoLogger;

  /**
   * Authenticated user claims from JWT
   * Available after auth middleware validates the token
   */
  ssoUser: JWTClaims;

  /**
   * Raw JWT token string
   * Available after auth middleware validates the token
   */
  ssoToken: string;
};
