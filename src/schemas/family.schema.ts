import { z } from 'zod';
import { MemberSchema } from './member.schema';

/**
 * Family API Validation Schemas
 * Defines the shape and validation rules for family endpoints
 */

export const CreateFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required'),
});

export const FamilySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  ownerId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  members: z.array(MemberSchema).optional(),
});

export const CreateFamilyResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    family: FamilySchema,
  }),
});

export const GetFamilyResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    family: FamilySchema,
  }),
});

export const UpdateFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required'),
});

export const UpdateFamilyResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    family: FamilySchema,
  }),
});

export const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
});

export const TransferOwnershipResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    family: FamilySchema,
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type Family = z.infer<typeof FamilySchema>;
export type CreateFamilyRequest = z.infer<typeof CreateFamilySchema>;
export type CreateFamilyResponse = z.infer<typeof CreateFamilyResponseSchema>;
export type GetFamilyResponse = z.infer<typeof GetFamilyResponseSchema>;
export type UpdateFamilyRequest = z.infer<typeof UpdateFamilySchema>;
export type UpdateFamilyResponse = z.infer<typeof UpdateFamilyResponseSchema>;
export type TransferOwnershipRequest = z.infer<typeof TransferOwnershipSchema>;
export type TransferOwnershipResponse = z.infer<typeof TransferOwnershipResponseSchema>;
