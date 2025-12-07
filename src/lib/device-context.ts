/**
 * Device Context Utilities
 *
 * Provides helpers for extracting device context information from HTTP requests.
 * Used across authentication and user-related operations.
 */

import type { Context } from 'hono';

/**
 * Device context information extracted from HTTP requests
 */
export type DeviceContext = {
  platform: 'WEB';
  clientIP: string;
  userAgent: string;
};

/**
 * Extract device context from Hono request
 *
 * Extracts client IP, user agent, and platform information
 * from HTTP headers for SSO operations.
 *
 * @param c - Hono context object
 * @returns Device context object
 *
 * @example
 * ```typescript
 * const deviceContext = extractDeviceContext(c);
 * await ssoService.login(email, password, deviceContext);
 * ```
 */
export function extractDeviceContext(c: Context): DeviceContext {
  return {
    platform: 'WEB' as const,
    clientIP: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '0.0.0.0',
    userAgent: c.req.header('user-agent') || 'unknown',
  };
}
