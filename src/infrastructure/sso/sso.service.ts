import { Platform, SSOClient } from '@rshelekhov/sso-sdk';
import type {
  AuthTokens,
  DeviceContext,
  ISSOService,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserProfile,
} from '../ports/sso.port';

/**
 * SSO Service Implementation
 * Adapter that wraps the SSO SDK and implements the ISSOService interface
 *
 * This class bridges the external SSO SDK with our application's domain layer.
 */
export class SSOService implements ISSOService {
  private readonly client: SSOClient;

  constructor(config: {
    baseUrl: string;
    clientId: string;
    publicUrls: {
      emailVerification: string;
      passwordReset: string;
    };
  }) {
    this.client = new SSOClient(config);
  }

  // ============ Authentication Operations ============

  async register(
    email: string,
    password: string,
    name: string,
    deviceContext: DeviceContext
  ): Promise<{ userId: string; tokens: AuthTokens }> {
    const result = await this.client.register(
      email,
      password,
      name,
      this.mapDeviceContext(deviceContext)
    );

    if (!result.tokenData) {
      throw new Error('Registration succeeded but no tokens were returned');
    }

    return {
      userId: result.userId,
      tokens: {
        accessToken: result.tokenData.accessToken,
        refreshToken: result.tokenData.refreshToken,
        expiresAt: result.tokenData.expiresAt,
      },
    };
  }

  async login(email: string, password: string, deviceContext: DeviceContext): Promise<AuthTokens> {
    const tokenData = await this.client.login(
      email,
      password,
      this.mapDeviceContext(deviceContext)
    );

    return {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
    };
  }

  async logout(accessToken: string, deviceContext: DeviceContext): Promise<void> {
    await this.client.logout(accessToken, this.mapDeviceContext(deviceContext));
  }

  async refreshTokens(refreshToken: string, deviceContext: DeviceContext): Promise<AuthTokens> {
    const tokenData = await this.client.refreshTokens(
      refreshToken,
      this.mapDeviceContext(deviceContext)
    );

    return {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
    };
  }

  isTokenExpired(expiresAt: string): boolean {
    return this.client.isTokenExpired(expiresAt);
  }

  // ============ Email & Password Operations ============

  async verifyEmail(token: string): Promise<void> {
    await this.client.verifyEmail(token);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.resetPassword(email);
  }

  async changePassword(token: string, newPassword: string): Promise<void> {
    await this.client.changePassword(token, newPassword);
  }

  // ============ User Profile Operations ============

  async getProfile(accessToken: string): Promise<UserProfile> {
    const ssoUser = await this.client.getProfile(accessToken, {
      platform: Platform.WEB,
      clientIP: '0.0.0.0', // Not needed for this endpoint
      userAgent: 'remedy-backend',
    });

    return {
      id: ssoUser.id,
      email: ssoUser.email,
      name: ssoUser.name,
      verified: ssoUser.verified,
      updatedAt: ssoUser.updatedAt,
    };
  }

  async updateProfile(
    accessToken: string,
    updates: UpdateProfileRequest
  ): Promise<UpdateProfileResponse> {
    return await this.client.updateProfile(accessToken, updates, {
      platform: Platform.WEB,
      clientIP: '0.0.0.0', // Not needed for this endpoint
      userAgent: 'remedy-backend',
    });
  }

  async deleteAccount(accessToken: string): Promise<void> {
    await this.client.deleteAccount(accessToken, {
      platform: Platform.WEB,
      clientIP: '0.0.0.0', // Not needed for this endpoint
      userAgent: 'remedy-backend',
    });
  }

  // ============ Private Helpers ============

  /**
   * Map application DeviceContext to SDK DeviceContext
   */
  private mapDeviceContext(context: DeviceContext) {
    return {
      platform: this.mapPlatform(context.platform),
      clientIP: context.clientIP,
      userAgent: context.userAgent,
      version: context.version,
    };
  }

  /**
   * Map application platform string to SDK Platform enum
   */
  private mapPlatform(platform: 'WEB' | 'IOS' | 'ANDROID'): Platform {
    switch (platform) {
      case 'WEB':
        return Platform.WEB;
      case 'IOS':
        return Platform.iOS;
      case 'ANDROID':
        return Platform.ANDROID;
    }
  }
}
