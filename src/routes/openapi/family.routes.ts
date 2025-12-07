import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';
import {
  CreateFamilyResponseSchema,
  CreateFamilySchema,
  GetFamilyResponseSchema,
  TransferOwnershipResponseSchema,
  TransferOwnershipSchema,
  UpdateFamilyResponseSchema,
  UpdateFamilySchema,
} from '../../schemas/family.schema';

/**
 * OpenAPI Route Definitions for Family Endpoints
 * Protected routes that require authentication
 */

export const createFamilyRoute = createRoute({
  method: 'post',
  path: '/',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateFamilySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: CreateFamilyResponseSchema,
        },
      },
      description: 'Family created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - Invalid input',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing authentication',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family already exists',
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
  tags: ['Families'],
  summary: 'Create a new family',
  description: 'Creates a new family for the authenticated user',
});

export const getFamilyRoute = createRoute({
  method: 'get',
  path: '/:id',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetFamilyResponseSchema,
        },
      },
      description: 'Family details retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - Invalid family ID format',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing authentication',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family not found',
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
  tags: ['Families'],
  summary: 'Get family details',
  description: 'Retrieves details of a specific family by ID for the authenticated user',
});

export const updateFamilyRoute = createRoute({
  method: 'patch',
  path: '/:id',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateFamilySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UpdateFamilyResponseSchema,
        },
      },
      description: 'Family updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - Invalid input',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing authentication',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family not found',
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
  tags: ['Families'],
  summary: 'Update family details',
  description: 'Updates details of a specific family by ID for the authenticated user',
});

export const deleteFamilyRoute = createRoute({
  method: 'delete',
  path: '/:id',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'Family deleted successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - Invalid family ID format',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing authentication',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family not found',
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
  tags: ['Families'],
  summary: 'Delete a family',
  description:
    'Deletes a specific family by ID for the authenticated user. Also deletes all associated family members, visits, files, medications and data about allergies.',
});

export const transferOwnershipRoute = createRoute({
  method: 'patch',
  path: '/:id/ownership',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
    }),
    body: {
      content: {
        'application/json': {
          schema: TransferOwnershipSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TransferOwnershipResponseSchema,
        },
      },
      description: 'Family ownership transferred successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - Invalid new owner',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing authentication',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden - User is not the current owner',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family not found',
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
  tags: ['Families'],
  summary: 'Transfer family ownership',
  description:
    'Transfers ownership of a family to another family member. Only the current owner can initiate the transfer. The new owner must be an existing family member with a linked user account.',
});
