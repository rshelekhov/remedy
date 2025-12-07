/**
 * Domain Errors
 * Custom error classes for business logic errors
 */

/**
 * Base class for all domain errors
 * Extend this class to create specific domain errors
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when trying to create a resource that already exists
 * Maps to HTTP 409 Conflict
 */
export class ResourceAlreadyExistsError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(`${resource} already exists for ${identifier}`);
  }
}

/**
 * Thrown when a requested resource is not found
 * Maps to HTTP 404 Not Found
 */
export class ResourceNotFoundError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`);
  }
}

/**
 * Thrown when the request violates business rules
 * Maps to HTTP 400 Bad Request
 */
export class ValidationError extends DomainError {}

/**
 * Thrown when authentication credentials are invalid
 * Maps to HTTP 401 Unauthorized
 * Used to normalize authentication failures without revealing if user exists
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid credentials');
  }
}

/**
 * Thrown when user attempts to delete account while owning resources
 * Maps to HTTP 409 Conflict
 */
export class OwnershipConstraintError extends DomainError {
  constructor(resource: string) {
    super(`Cannot delete account while owning ${resource}. Please transfer ownership first.`);
  }
}

/**
 * Thrown when user is not authorized to perform an operation
 * Maps to HTTP 403 Forbidden
 */
export class UnauthorizedOperationError extends DomainError {
  constructor(operation: string) {
    super(`You are not authorized to ${operation}`);
  }
}

/**
 * Thrown when new owner is not eligible for ownership
 * Maps to HTTP 400 Bad Request
 */
export class InvalidOwnerError extends DomainError {
  constructor(reason: string) {
    super(`Invalid new owner: ${reason}`);
  }
}
