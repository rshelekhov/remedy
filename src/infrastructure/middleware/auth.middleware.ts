/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens using JWKS from the SSO server.
 * Attaches authenticated user claims to the Hono context.
 *
 * Usage:
 * ```typescript
 * import { authMiddleware } from '@/infrastructure/middleware/auth.middleware';
 *
 * // Apply to protected routes
 * router.use('/api/protected/*', authMiddleware);
 * ```
 */

import { AuthMiddleware } from '@rshelekhov/sso-sdk';
import { config } from '../../config/config';

/**
 * Initialize JWT Auth Middleware with SSO configuration
 *
 * This middleware:
 * 1. Extracts JWT from Authorization header or cookie
 * 2. Validates JWT signature using JWKS from SSO
 * 3. Verifies issuer and audience claims
 * 4. Attaches user claims to context as c.get('ssoUser')
 */
const authMiddlewareInstance = new AuthMiddleware({
  jwksUrl: `${config.sso.apiUrl}/v1/auth/.well-known/jwks.json`,
  issuer: 'sso-service',
  audience: config.sso.clientId,
  clientId: config.sso.clientId,
  cookieAuth: false, // We only use Authorization header for API
});

/**
 * Hono-compatible JWT middleware
 * Use this to protect routes that require authentication
 */
export const authMiddleware = authMiddlewareInstance.hono();
