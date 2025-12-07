import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';
import {
  GetFileResponseSchema,
  ListVisitFilesResponseSchema,
  UploadFileResponseSchema,
} from '../../schemas/file.schema';

/**
 * OpenAPI Route Definitions for File Endpoints
 * Protected routes that require authentication
 */

export const listVisitFilesRoute = createRoute({
  method: 'get',
  path: '/:id/visits/:visitId/files',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      visitId: z.uuid('Invalid visit ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ListVisitFilesResponseSchema,
        },
      },
      description: 'Files retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Missing or invalid authorization token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to view files for this visit',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Visit not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

export const uploadFileRoute = createRoute({
  method: 'post',
  path: '/:id/visits/:visitId/files',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      visitId: z.uuid('Invalid visit ID format'),
    }),
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().describe('File to upload'),
            category: z.string().optional().describe('File category (optional)'),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: UploadFileResponseSchema,
        },
      },
      description: 'File uploaded successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid file (size, type, or other validation error)',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Missing or invalid authorization token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to upload files for this visit',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Visit not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

export const getFileRoute = createRoute({
  method: 'get',
  path: '/:id/files/:fileId',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      fileId: z.uuid('Invalid file ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetFileResponseSchema,
        },
      },
      description: 'File details and download URL retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Missing or invalid authorization token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to access this file',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'File not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

export const deleteFileRoute = createRoute({
  method: 'delete',
  path: '/:id/files/:fileId',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      fileId: z.uuid('Invalid file ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'File deleted successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Missing or invalid authorization token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to delete this file',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'File not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});
