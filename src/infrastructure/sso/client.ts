/**
 * SSO Client Configuration
 *
 * This file initializes the SSO service at application startup.
 * Import and use `getSSOService()` from './index' in your application code.
 *
 * @example
 * ```typescript
 * import { getSSOService } from '@/infrastructure/sso';
 *
 * const ssoService = getSSOService();
 * const tokens = await ssoService.login(email, password, deviceContext);
 * ```
 */

import { config } from '../../config/config';
import { initializeSSOService } from './index';

// Initialize SSO service with configuration from central config
export const ssoService = initializeSSOService({
  baseUrl: config.sso.apiUrl,
  clientId: config.sso.clientId,
  publicUrls: {
    emailVerification: config.sso.emailVerificationUrl,
    passwordReset: config.sso.passwordResetUrl,
  },
});
