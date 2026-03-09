import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

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
  USER_EMAIL_MISMATCH = 'USER_EMAIL_MISMATCH',
  INVALID_EMAIL_CONFIRMATION_TOKEN = 'INVALID_EMAIL_CONFIRMATION_TOKEN',
  EMAIL_ALREADY_VERIFIED = 'EMAIL_ALREADY_VERIFIED',
  PASSWORD_RESET_EMAIL_SENDING_FAILED = 'PASSWORD_RESET_EMAIL_SENDING_FAILED',
  USER_EMAIL_PROVIDER_BLACKLISTED = 'USER_EMAIL_PROVIDER_BLACKLISTED',
  USER_NOT_SUPER_ADMIN = 'USER_NOT_SUPER_ADMIN',
  USER_SELF_DEMOTION_NOT_ALLOWED = 'USER_SELF_DEMOTION_NOT_ALLOWED',
  USER_LAST_SUPER_ADMIN = 'USER_LAST_SUPER_ADMIN',
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
}

export class UserUnexpectedError extends UserError {
  constructor(error: Error, context?: string, metadata?: ErrorMetadata) {
    super(
      context
        ? `An unexpected error occurred: ${context}`
        : 'An unexpected error occurred',
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
  constructor(identifier: string, metadata?: ErrorMetadata) {
    super(
      `User '${identifier}' not found`,
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

/**
 * Error thrown when a user email mismatch is detected
 */
export class UserEmailMismatchError extends UserError {
  constructor(userId: string, metadata?: ErrorMetadata) {
    super(
      `User email mismatch for user with ID '${userId}'`,
      UserErrorCode.USER_EMAIL_MISMATCH,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an email confirmation token is invalid
 */
export class InvalidEmailConfirmationTokenError extends UserError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Invalid email confirmation token${reason ? `: ${reason}` : ''}`,
      UserErrorCode.INVALID_EMAIL_CONFIRMATION_TOKEN,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when a user email is already verified
 */
export class UserEmailAlreadyVerifiedError extends UserError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      `Email already verified${reason ? `: ${reason}` : ''}`,
      UserErrorCode.EMAIL_ALREADY_VERIFIED,
      400,
      metadata,
    );
  }
}

export class PasswordResetEmailSendingFailedError extends UserError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to send password reset email: ${reason}`,
      UserErrorCode.PASSWORD_RESET_EMAIL_SENDING_FAILED,
      500,
      metadata,
    );
  }
}

export class UserNotSuperAdminError extends UserError {
  constructor(userId: string, metadata?: ErrorMetadata) {
    super(
      `User '${userId}' is not a super admin`,
      UserErrorCode.USER_NOT_SUPER_ADMIN,
      422,
      metadata,
    );
  }
}

export class UserSelfDemotionNotAllowedError extends UserError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Cannot remove your own super admin status',
      UserErrorCode.USER_SELF_DEMOTION_NOT_ALLOWED,
      403,
      metadata,
    );
  }
}

export class UserLastSuperAdminError extends UserError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Cannot demote the last super admin',
      UserErrorCode.USER_LAST_SUPER_ADMIN,
      409,
      metadata,
    );
  }
}

export class UserEmailProviderBlacklistedError extends UserError {
  constructor(emailProvider: string, metadata?: ErrorMetadata) {
    super(
      `Email provider blacklisted: ${emailProvider}`,
      UserErrorCode.USER_EMAIL_PROVIDER_BLACKLISTED,
      400,
      metadata,
    );
  }
}
