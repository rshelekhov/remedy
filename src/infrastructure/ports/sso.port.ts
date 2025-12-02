/**
 * Device context information extracted from HTTP requests
 */
export interface DeviceContext {
  platform: 'WEB' | 'IOS' | 'ANDROID';
  clientIP: string;
  userAgent: string;
  version?: string;
}

/**
 * Authentication tokens returned from SSO
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * User profile update request
 */
export interface UpdateProfileRequest {
  email?: string;
  name?: string;
  currentPassword?: string;
  updatedPassword?: string;
}

/**
 * Response from updating user profile
 */
export interface UpdateProfileResponse {
  email: string;
  name: string;
  updatedAt: string;
}

/**
 * User profile returned from SSO
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  updatedAt: string;
}

/**
 * SSO Port (Interface)
 * Defines the contract for SSO operations needed by the application
 *
 * This interface decouples the domain logic from the specific SSO implementation.
 * The infrastructure layer provides the concrete implementation.
 */
export interface ISSOService {
  // ============ Authentication Operations ============

  /**
   * Register a new user
   * @returns User ID and auth tokens
   */
  register(
    email: string,
    password: string,
    name: string,
    deviceContext: DeviceContext
  ): Promise<{ userId: string; tokens: AuthTokens }>;

  /**
   * Login user with email and password
   * @returns Auth tokens
   */
  login(email: string, password: string, deviceContext: DeviceContext): Promise<AuthTokens>;

  /**
   * Logout user (invalidate session)
   */
  logout(accessToken: string, deviceContext: DeviceContext): Promise<void>;

  /**
   * Refresh access token using refresh token
   * @returns New auth tokens
   */
  refreshTokens(refreshToken: string, deviceContext: DeviceContext): Promise<AuthTokens>;

  /**
   * Check if access token is expired or about to expire
   */
  isTokenExpired(expiresAt: string): boolean;

  // ============ Email & Password Operations ============

  /**
   * Verify user email using token from email link
   */
  verifyEmail(token: string): Promise<void>;

  /**
   * Send password reset email
   */
  requestPasswordReset(email: string): Promise<void>;

  /**
   * Change password using reset token
   */
  changePassword(token: string, newPassword: string): Promise<void>;

  // ============ User Profile Operations ============

  /**
   * Get authenticated user's profile
   * @returns User profile information
   */
  getProfile(accessToken: string): Promise<UserProfile>;

  /**
   * Update authenticated user's profile
   */
  updateProfile(accessToken: string, updates: UpdateProfileRequest): Promise<UpdateProfileResponse>;

  /**
   * Delete authenticated user's account
   */
  deleteAccount(accessToken: string): Promise<void>;
}
