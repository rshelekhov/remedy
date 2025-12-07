import { createRoute } from '@hono/zod-openapi';
import {
  ChangePasswordSchema,
  LoginResponseSchema,
  LoginSchema,
  RefreshTokensResponseSchema,
  RefreshTokensSchema,
  RegisterResponseSchema,
  RegisterSchema,
  RequestPasswordResetSchema,
  VerifyEmailSchema,
} from '../../schemas/auth.schema';
import { ErrorResponseSchema, SuccessMessageSchema } from '../../schemas/common.schema';

/**
 * OpenAPI Route Definitions for Auth Endpoints
 * These define the API contract including request/response schemas and documentation
 */

export const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: RegisterResponseSchema,
        },
      },
      description: 'User registered successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request data',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User already exists',
    },
  },
  tags: ['Authentication'],
  summary: 'Register a new user',
  description: 'Creates a new user account with email and password',
});

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
      description: 'User logged in successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request data',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid credentials',
    },
  },
  tags: ['Authentication'],
  summary: 'Login user',
  description: 'Authenticates a user with email and password',
});

export const verifyEmailRoute = createRoute({
  method: 'get',
  path: '/verify-email',
  request: {
    query: VerifyEmailSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'Email verified successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid or expired verification token',
    },
  },
  tags: ['Authentication'],
  summary: 'Verify email address',
  description: 'Verifies user email using the token sent to their email',
});

export const requestPasswordResetRoute = createRoute({
  method: 'post',
  path: '/password-reset/request',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RequestPasswordResetSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'Password reset email sent',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User not found',
    },
  },
  tags: ['Authentication'],
  summary: 'Request password reset',
  description: 'Sends a password reset email to the user',
});

export const changePasswordRoute = createRoute({
  method: 'post',
  path: '/password-reset/confirm',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChangePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessMessageSchema,
        },
      },
      description: 'Password changed successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid or expired reset token',
    },
  },
  tags: ['Authentication'],
  summary: 'Change password',
  description: 'Changes user password using reset token',
});

export const refreshTokensRoute = createRoute({
  method: 'post',
  path: '/refresh',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RefreshTokensSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: RefreshTokensResponseSchema,
        },
      },
      description: 'Tokens refreshed successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request data',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid or expired refresh token',
    },
  },
  tags: ['Authentication'],
  summary: 'Refresh access token',
  description: 'Refreshes the access token using a valid refresh token',
});
