import { z } from 'zod';
import { FileSchema } from './file.schema';
import { MedicationSchema } from './medication.schema';

/**
 * Visits API Validation Schemas
 * Defines the shape and validation rules for visit endpoints
 */

export const VisitSchema = z.object({
  id: z.uuid(),
  familyMemberId: z.uuid(),
  visitDate: z.iso.datetime(),
  chiefComplaint: z.string(),
  diagnosis: z.string().nullable(),
  treatment: z.string().nullable(),
  doctorName: z.string().nullable(),
  clinicName: z.string().nullable(),
  notes: z.string().nullable(),
  files: z.array(FileSchema).optional(),
  medications: z.array(MedicationSchema).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AddVisitSchema = z.object({
  visitDate: z.iso.datetime(),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  diagnosis: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  doctorName: z.string().optional().nullable(),
  clinicName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const AddVisitResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    visit: VisitSchema,
  }),
});

export const GetVisitResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    visit: VisitSchema,
  }),
});

export const GetAllMemberVisitsResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    visits: z.array(VisitSchema),
  }),
});

export const UpdateVisitSchema = z
  .object({
    visitDate: z.iso.datetime().optional(),
    chiefComplaint: z.string().min(1, 'Chief complaint cannot be empty').optional(),
    diagnosis: z.string().optional().nullable(),
    treatment: z.string().optional().nullable(),
    doctorName: z.string().optional().nullable(),
    clinicName: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const UpdateVisitResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    visit: VisitSchema,
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type Visit = z.infer<typeof VisitSchema>;
export type AddVisitRequest = z.infer<typeof AddVisitSchema>;
export type AddVisitResponse = z.infer<typeof AddVisitResponseSchema>;
export type GetVisitResponse = z.infer<typeof GetVisitResponseSchema>;
export type GetAllMemberVisitsResponse = z.infer<typeof GetAllMemberVisitsResponseSchema>;
export type UpdateVisitRequest = z.infer<typeof UpdateVisitSchema>;
export type UpdateVisitResponse = z.infer<typeof UpdateVisitResponseSchema>;
