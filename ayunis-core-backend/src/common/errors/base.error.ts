import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';

export type ErrorCode = string;

export interface ErrorMetadata {
  [key: string]: unknown;
}

/**
 * Base application error class that all domain-specific errors should extend
 */
export abstract class ApplicationError extends Error {
  /**
   * Error code - used for identifying the error type
   */
  readonly code: ErrorCode;

  /**
   * HTTP status code that should be returned to the client
   */
  readonly statusCode: number;

  /**
   * Additional error metadata
   */
  readonly metadata?: ErrorMetadata;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Maintain proper stack trace for where the error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    const body = {
      code: this.code,
      message: this.message,
      ...(this.metadata && { metadata: this.metadata }),
    };

    switch (this.statusCode) {
      case 401:
        return new UnauthorizedException(body);
      case 403:
        return new ForbiddenException(body);
      case 404:
        return new NotFoundException(body);
      case 409:
        return new ConflictException(body);
      case 500:
        return new InternalServerErrorException(body);
      case 501:
        return new NotImplementedException(body);
      case 504:
        return new GatewayTimeoutException(body);
      default:
        return new BadRequestException(body);
    }
  }
}
