import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';
import {
  AddVisitResponseSchema,
  AddVisitSchema,
  GetAllMemberVisitsResponseSchema,
  GetVisitResponseSchema,
  UpdateVisitResponseSchema,
  UpdateVisitSchema,
} from '../../schemas/visit.schema';

/**
 * OpenAPI Route Definitions for Visit Endpoints
 * Protected routes that require authentication
 */

export const addVisitRoute = createRoute({
  method: 'post',
  path: '/:id/members/:memberId/visits',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      memberId: z.uuid('Invalid member ID format'),
    }),
    body: {
      content: {
        'application/json': {
          schema: AddVisitSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AddVisitResponseSchema,
        },
      },
      description: 'Visit added successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters or body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - invalid or missing authentication token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to add visits for this family member',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family or member not found',
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

export const getVisitRoute = createRoute({
  method: 'get',
  path: '/:id/visits/:visitId',
  security: [
    {
      Bearer: [],
    },
  ],
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
          schema: GetVisitResponseSchema,
        },
      },
      description: 'Visit retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters or body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - invalid or missing authentication token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to view visits for this family member',
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

export const getAllMemberVisitsRoute = createRoute({
  method: 'get',
  path: '/:id/members/:memberId/visits',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      memberId: z.uuid('Invalid member ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetAllMemberVisitsResponseSchema,
        },
      },
      description: 'Member visits retrieved successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters or body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - invalid or missing authentication token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to view visits for this family member',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family or member not found',
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

export const updateVisitRoute = createRoute({
  method: 'put',
  path: '/:id/visits/:visitId',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      visitId: z.uuid('Invalid visit ID format'),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateVisitSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UpdateVisitResponseSchema,
        },
      },
      description: 'Visit updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters or body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - invalid or missing authentication token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to update this visit',
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

export const deleteVisitRoute = createRoute({
  method: 'delete',
  path: '/:id/visits/:visitId',
  security: [
    {
      Bearer: [],
    },
  ],
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
          schema: SuccessMessageSchema,
        },
      },
      description: 'Visit deleted successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request parameters or body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - invalid or missing authentication token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User is not authorized to delete this visit',
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
