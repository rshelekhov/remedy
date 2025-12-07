import { z } from 'zod';

/**
 * User API Validation Schemas
 * Defines the shape and validation rules for user endpoints
 */

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  verified: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export const GetUserProfileResponseSchema = z.object({
  data: z.object({
    profile: UserProfileSchema,
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type GetUserProfileResponse = z.infer<typeof GetUserProfileResponseSchema>;
