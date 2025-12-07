import { z } from 'zod';

/**
 * File API Validation Schemas
 * Defines the shape and validation rules for file management endpoints
 */

export const FileSchema = z.object({
  id: z.uuid(),
  visitId: z.uuid(),

  s3Key: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  category: z.string().nullable(),
  uploadedAt: z.iso.datetime(),
});

/**
 * File Upload Constraints
 * Defines validation rules for file uploads
 */
export const FILE_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_CATEGORIES: [
    'Lab Result',
    'Prescription',
    'Imaging',
    'Consultation Notes',
    'Insurance',
    'Other',
  ],
} as const;

/**
 * Response Schemas
 */
export const ListVisitFilesResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    files: z.array(FileSchema),
  }),
});

export const UploadFileResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    file: FileSchema,
  }),
});

export const GetFileResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    file: FileSchema,
    downloadUrl: z.string().url(),
  }),
});

/**
 * Inferred Types (for use in controllers)
 * These are automatically derived from the schemas above
 */
export type File = z.infer<typeof FileSchema>;
export type ListVisitFilesResponse = z.infer<typeof ListVisitFilesResponseSchema>;
export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>;
export type GetFileResponse = z.infer<typeof GetFileResponseSchema>;
