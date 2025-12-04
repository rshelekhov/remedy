import { z } from 'zod';
import { TokensSchema, UserSchema } from './common.schema';

/**
 * Auth API Validation Schemas
 * Defines the shape and validation rules for auth endpoints
 */

export const RegisterSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export const LoginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const VerifyEmailSchema = z.object({
  token: z.uuid('Invalid verification token format'),
});

export const RequestPasswordResetSchema = z.object({
  email: z.email('Invalid email format'),
});

export const ChangePasswordSchema = z.object({
  token: z.uuid('Invalid reset token format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RefreshTokensSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Auth Response Schemas
 */

export const RegisterResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    user: UserSchema,
    tokens: TokensSchema,
  }),
});

export const LoginResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    tokens: TokensSchema,
  }),
});

export const RefreshTokensResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    tokens: TokensSchema,
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailSchema>;
export type RequestPasswordResetRequest = z.infer<typeof RequestPasswordResetSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type RefreshTokensRequest = z.infer<typeof RefreshTokensSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshTokensResponse = z.infer<typeof RefreshTokensResponseSchema>;
