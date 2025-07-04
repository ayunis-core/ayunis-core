import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Error codes specific to the Users domain
 */
export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_AUTHENTICATION_FAILED = 'USER_AUTHENTICATION_FAILED',
  USER_UNAUTHORIZED = 'USER_UNAUTHORIZED',
  USER_INVALID_INPUT = 'USER_INVALID_INPUT',
  USER_UNEXPECTED_ERROR = 'USER_UNEXPECTED_ERROR',
}

/**
 * Base user error that all user-specific errors should extend
 */
export abstract class UserError extends ApplicationError {
  constructor(
    message: string,
    code: UserErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 409:
        return new ConflictException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 401:
        return new UnauthorizedException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

export class UserUnexpectedError extends UserError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'An unexpected error occurred while updating user role',
      UserErrorCode.USER_UNEXPECTED_ERROR,
      500,
      {
        ...metadata,
        error: error,
      },
    );
  }
}

/**
 * Error thrown when a user is not found
 */
export class UserNotFoundError extends UserError {
  constructor(userId: string, metadata?: ErrorMetadata) {
    super(
      `User with ID '${userId}' not found`,
      UserErrorCode.USER_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when a user already exists
 */
export class UserAlreadyExistsError extends UserError {
  constructor(identifier: string, metadata?: ErrorMetadata) {
    super(
      `User with identifier '${identifier}' already exists`,
      UserErrorCode.USER_ALREADY_EXISTS,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when user authentication fails
 */
export class UserAuthenticationFailedError extends UserError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Authentication failed: ${reason}`,
      UserErrorCode.USER_AUTHENTICATION_FAILED,
      401,
      metadata,
    );
  }
}

/**
 * Error thrown when a user is unauthorized
 */
export class UserUnauthorizedError extends UserError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Unauthorized: ${reason}`,
      UserErrorCode.USER_UNAUTHORIZED,
      403,
      metadata,
    );
  }
}

/**
 * Error thrown when user input is invalid
 */
export class UserInvalidInputError extends UserError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid user input: ${reason}`,
      UserErrorCode.USER_INVALID_INPUT,
      400,
      metadata,
    );
  }
}
