import { SSOService } from './sso.service';
import type { ISSOService } from '../ports/sso.port';

/**
 * SSO Service singleton instance
 * Create this ONCE at application startup and reuse across all requests
 */
let ssoServiceInstance: ISSOService | null = null;

/**
 * Initialize the SSO service with configuration
 * Call this once at application startup
 */
export function initializeSSOService(config: {
  baseUrl: string;
  clientId: string;
  publicUrls: {
    emailVerification: string;
    passwordReset: string;
  };
}): ISSOService {
  if (ssoServiceInstance) {
    throw new Error('SSO service already initialized');
  }

  ssoServiceInstance = new SSOService(config);
  return ssoServiceInstance;
}

/**
 * Get the SSO service instance
 * Throws error if not initialized
 */
export function getSSOService(): ISSOService {
  if (!ssoServiceInstance) {
    throw new Error('SSO service not initialized. Call initializeSSOService() first.');
  }

  return ssoServiceInstance;
}

// Re-export types and interfaces for convenience
export type {
  AuthTokens,
  DeviceContext,
  ISSOService,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserProfile,
} from '../ports/sso.port';
export { SSOService } from './sso.service';
