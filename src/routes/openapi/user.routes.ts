import { createRoute } from '@hono/zod-openapi';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';
import { GetUserProfileResponseSchema } from '../../schemas/user.schema';

/**
 * OpenAPI Route Definitions for User Endpoints
 * Protected routes that require authentication
 */

export const getUserProfileRoute = createRoute({
  method: 'get',
  path: '/profile',
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GetUserProfileResponseSchema,
        },
      },
      description: 'User profile retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing token',
    },
  },
  tags: ['User'],
  summary: 'Get user profile',
  description: 'Retrieves the authenticated user profile from SSO',
});

export const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'User logged out successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing token',
    },
  },
  tags: ['User'],
  summary: 'Logout user',
  description: 'Logs out the current user and invalidates the session on SSO',
});

export const deleteUserAccountRoute = createRoute({
  method: 'delete',
  path: '/account',
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'User account deleted successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing token',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Cannot delete account - User owns a family',
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
  tags: ['User'],
  summary: 'Delete user account',
  description:
    'Deletes the authenticated user account. User must not own a family - transfer ownership first.',
});

export const forceDeleteUserRoute = createRoute({
  method: 'delete',
  path: '/force',
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'User account and all data forcefully deleted',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid or missing token',
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
  tags: ['User'],
  summary: 'Force delete user account',
  description:
    'Forcefully deletes user account and all associated data (family, members, visits, files, medications, allergies). Bypasses ownership constraints.',
});
