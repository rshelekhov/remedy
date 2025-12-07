import { z } from 'zod';

/**
 * Member API Validation Schemas
 * Defines the shape and validation rules for member endpoints
 */

export const MemberSchema = z.object({
  id: z.uuid(),
  familyId: z.uuid(),
  userId: z.string().nullable(),
  name: z.string(),
  dateOfBirth: z.iso.datetime().nullable(),
  gender: z.string().nullable(),
  relationship: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AddMemberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  dateOfBirth: z.iso.datetime().optional().nullable(),
  gender: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  userId: z.uuid('Invalid user ID format').optional().nullable(),
});

export const AddMemberResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    member: MemberSchema,
  }),
});

export const GetMemberResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    member: MemberSchema,
  }),
});

export const GetAllMembersResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    members: z.array(MemberSchema),
  }),
});

export const UpdateMemberSchema = z
  .object({
    name: z.string().min(1, 'Member name cannot be empty').optional(),
    dateOfBirth: z.iso.datetime().optional().nullable(),
    gender: z.string().optional().nullable(),
    relationship: z.string().optional().nullable(),
    userId: z.uuid('Invalid user ID format').optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const UpdateMemberResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    member: MemberSchema,
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type Member = z.infer<typeof MemberSchema>;
export type AddMemberRequest = z.infer<typeof AddMemberSchema>;
export type AddMemberResponse = z.infer<typeof AddMemberResponseSchema>;
export type GetMemberResponse = z.infer<typeof GetMemberResponseSchema>;
export type GetAllMembersResponse = z.infer<typeof GetAllMembersResponseSchema>;
export type UpdateMemberRequest = z.infer<typeof UpdateMemberSchema>;
export type UpdateMemberResponse = z.infer<typeof UpdateMemberResponseSchema>;
