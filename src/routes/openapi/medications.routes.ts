import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';
import {
  AddMedicationResponseSchema,
  AddMedicationSchema,
  GetAllMemberMedicationsResponseSchema,
  GetAllVisitMedicationsResponseSchema,
  GetMedicationResponseSchema,
  UpdateMedicationResponseSchema,
  UpdateMedicationSchema,
} from '../../schemas/medication.schema';

export const addMedicationRoute = createRoute({
  method: 'post',
  path: '/:id/members/:memberId/medications',
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
          schema: AddMedicationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AddMedicationResponseSchema,
        },
      },
      description: 'Medication added successfully',
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
      description: 'User is not authorized to add medications for this family member',
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

export const getMedicationRoute = createRoute({
  method: 'get',
  path: '/:id/medications/:medicationId',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      medicationId: z.uuid('Invalid visit ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetMedicationResponseSchema,
        },
      },
      description: 'Medication retrieved successfully',
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
      description: 'User is not authorized to view medications for this family member',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Medication not found',
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

export const getAllMemberMedicationsRoute = createRoute({
  method: 'get',
  path: '/:id/members/:memberId/medications',
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
          schema: GetAllMemberMedicationsResponseSchema,
        },
      },
      description: 'Member medications retrieved successfully',
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
      description: 'User is not authorized to view medications for this family member',
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

export const getAllVisitMedicationsRoute = createRoute({
  method: 'get',
  path: '/:id/visits/:visitId/medications',
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
          schema: GetAllVisitMedicationsResponseSchema,
        },
      },
      description: 'Visit medications retrieved successfully',
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
      description: 'User is not authorized to view medications for this visit',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family or visit not found',
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

export const updateMedicationRoute = createRoute({
  method: 'put',
  path: '/:id/medications/:medicationId',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      medicationId: z.uuid('Invalid medication ID format'),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateMedicationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UpdateMedicationResponseSchema,
        },
      },
      description: 'Medication updated successfully',
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
      description: 'User is not authorized to update this medication',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Medication not found',
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

export const deleteMedicationRoute = createRoute({
  method: 'delete',
  path: '/:id/medications/:medicationId',
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.uuid('Invalid family ID format'),
      medicationId: z.uuid('Invalid medication ID format'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'Medication deleted successfully',
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
      description: 'User is not authorized to delete this medication',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Medication not found',
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
