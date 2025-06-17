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
 * Error codes specific to the Authentication domain
 */
export enum AuthenticationErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
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
