import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

/**
 * Error codes specific to the Authentication domain
 */
export enum AuthenticationErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  REGISTRATION_DISABLED = 'REGISTRATION_DISABLED',
}

/**
 * Base authentication error that all authentication-specific errors should extend
 */
export abstract class AuthenticationError extends ApplicationError {
  constructor(
    message: string,
    code: AuthenticationErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationFailedError extends AuthenticationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Authentication failed: ${reason}`,
      AuthenticationErrorCode.AUTHENTICATION_FAILED,
      401,
      metadata,
    );
  }
}

/**
 * Error thrown when credentials are invalid
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid credentials: ${reason}`,
      AuthenticationErrorCode.INVALID_CREDENTIALS,
      401,
      metadata,
    );
  }
}

/**
 * Error thrown when token is invalid
 */
export class InvalidTokenError extends AuthenticationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid token: ${reason}`,
      AuthenticationErrorCode.INVALID_TOKEN,
      401,
      metadata,
    );
  }
}

/**
 * Error thrown when token has expired
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Token has expired',
      AuthenticationErrorCode.TOKEN_EXPIRED,
      401,
      metadata,
    );
  }
}

/**
 * Error thrown when password is invalid
 */
export class InvalidPasswordError extends AuthenticationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid password: ${reason}`,
      AuthenticationErrorCode.INVALID_PASSWORD,
      400,
      metadata,
    );
  }
}

export class UnexpectedAuthenticationError extends AuthenticationError {
  constructor(error: unknown) {
    super(
      `Unexpected authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      AuthenticationErrorCode.UNEXPECTED_ERROR,
      400,
      {
        error,
      },
    );
  }
}

export class RegistrationDisabledError extends AuthenticationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Registration is disabled',
      AuthenticationErrorCode.REGISTRATION_DISABLED,
      403,
      metadata,
    );
  }
}
