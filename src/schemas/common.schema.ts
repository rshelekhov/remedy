import { z } from 'zod';

/**
 * Common API Response Schemas
 * Reusable schemas for consistent API responses
 */

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export const SuccessMessageSchema = z.object({
  message: z.string(),
});

export const TokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessMessage = z.infer<typeof SuccessMessageSchema>;
export type Tokens = z.infer<typeof TokensSchema>;
export type User = z.infer<typeof UserSchema>;
