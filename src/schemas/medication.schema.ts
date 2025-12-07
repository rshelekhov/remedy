import { z } from 'zod';

/**
 * Medications API Validation Schemas
 * Defines the shape and validation rules for medication management endpoints
 */

export const MedicationSchema = z.object({
  id: z.uuid(),
  familyMemberId: z.uuid(),
  visitId: z.uuid().nullable(),
  name: z.string(),
  dosage: z.string().nullable(),
  frequency: z.string().nullable(),
  startDate: z.iso.datetime().nullable(),
  endDate: z.iso.datetime().nullable(),
  prescribingDoctor: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const AddMedicationSchema = z.object({
  visitId: z.uuid().optional().nullable(),
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  startDate: z.iso.datetime().optional().nullable(),
  endDate: z.iso.datetime().optional().nullable(),
  prescribingDoctor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const AddMedicationResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    medication: MedicationSchema,
  }),
});

export const GetMedicationResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    medication: MedicationSchema,
  }),
});

export const GetAllMemberMedicationsResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    medications: z.array(MedicationSchema),
  }),
});

export const GetAllVisitMedicationsResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    medications: z.array(MedicationSchema),
  }),
});

export const UpdateMedicationSchema = z
  .object({
    name: z.string().min(1, 'Medication name cannot be empty').optional(),
    dosage: z.string().optional().nullable(),
    frequency: z.string().optional().nullable(),
    startDate: z.iso.datetime().optional().nullable(),
    endDate: z.iso.datetime().optional().nullable(),
    prescribingDoctor: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const UpdateMedicationResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    medication: MedicationSchema,
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type Medication = z.infer<typeof MedicationSchema>;
export type AddMedicationRequest = z.infer<typeof AddMedicationSchema>;
export type AddMedicationResponse = z.infer<typeof AddMedicationResponseSchema>;
export type GetMedicationResponse = z.infer<typeof GetMedicationResponseSchema>;
export type GetAllMemberMedicationsResponse = z.infer<typeof GetAllMemberMedicationsResponseSchema>;
export type GetAllVisitMedicationsResponse = z.infer<typeof GetAllVisitMedicationsResponseSchema>;
export type UpdateMedicationRequest = z.infer<typeof UpdateMedicationSchema>;
export type UpdateMedicationResponse = z.infer<typeof UpdateMedicationResponseSchema>;
