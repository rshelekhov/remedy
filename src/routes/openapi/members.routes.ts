import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';
import {
  AddMemberResponseSchema,
  AddMemberSchema,
  GetAllMembersResponseSchema,
  GetMemberResponseSchema,
  UpdateMemberResponseSchema,
  UpdateMemberSchema,
} from '../../schemas/member.schema';

/**
 * OpenAPI Route Definitions for Member Endpoints
 * Protected routes that require authentication
 */

export const addMemberRoute = createRoute({
  method: 'post',
  path: '/:id/members',
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
          schema: AddMemberSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AddMemberResponseSchema,
        },
      },
      description: 'Member added successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family not found',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Member already exists in the family',
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

export const getMemberRoute = createRoute({
  method: 'get',
  path: '/:id/members/:memberId',
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
          schema: GetMemberResponseSchema,
        },
      },
      description: 'Member details retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Member not found',
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

export const getAllMembersRoute = createRoute({
  method: 'get',
  path: '/:id/members',
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
          schema: GetAllMembersResponseSchema,
        },
      },
      description: 'All family members retrieved successfully',
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
});

export const updateMemberRoute = createRoute({
  method: 'patch',
  path: '/:id/members/:memberId',
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
          schema: UpdateMemberSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UpdateMemberResponseSchema,
        },
      },
      description: 'Family member updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - Invalid input or validation error',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family or member not found (or user is not the family owner)',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Conflict - userId already assigned to another family member',
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
  tags: ['Members'],
  summary: 'Update family member',
  description:
    'Updates details of a specific family member. Only the family owner can update member information.',
});

export const deleteMemberRoute = createRoute({
  method: 'delete',
  path: '/:id/members/:memberId',
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
          schema: SuccessMessageSchema,
        },
      },
      description: 'Family member deleted successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Family or member not found (or user is not the family owner)',
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
  tags: ['Members'],
  summary: 'Delete family member',
  description:
    'Deletes a specific family member from the family. Only the family owner can delete members.',
});
