import { mapSSOErrorToHttp } from '@rshelekhov/sso-sdk';
import {
  DomainError,
  InvalidCredentialsError,
  InvalidOwnerError,
  OwnershipConstraintError,
  ResourceAlreadyExistsError,
  ResourceNotFoundError,
  UnauthorizedOperationError,
  ValidationError,
} from './domain-errors';

/**
 * HTTP error response structure
 */
export interface HttpError {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Map domain errors and SSO errors to HTTP responses
 * This centralizes error handling logic
 */
export function mapErrorToHttp(error: unknown): HttpError {
  // Domain errors - our business logic errors
  if (error instanceof InvalidCredentialsError) {
    return {
      statusCode: 401,
      message: error.message,
    };
  }

  if (error instanceof ResourceNotFoundError) {
    return {
      statusCode: 404,
      message: error.message,
    };
  }

  if (error instanceof ResourceAlreadyExistsError) {
    return {
      statusCode: 409,
      message: error.message,
    };
  }

  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      message: error.message,
    };
  }

  if (error instanceof OwnershipConstraintError) {
    return {
      statusCode: 409,
      message: error.message,
    };
  }

  if (error instanceof UnauthorizedOperationError) {
    return {
      statusCode: 403,
      message: error.message,
    };
  }

  if (error instanceof InvalidOwnerError) {
    return {
      statusCode: 400,
      message: error.message,
    };
  }

  if (error instanceof DomainError) {
    // Generic domain error - treat as bad request
    return {
      statusCode: 400,
      message: error.message,
    };
  }

  // SSO errors - delegate to SSO SDK mapper
  const ssoError = mapSSOErrorToHttp(error);
  return {
    statusCode: ssoError.statusCode,
    message: ssoError.message,
    code: ssoError.code,
    details: ssoError.details,
  };
}
