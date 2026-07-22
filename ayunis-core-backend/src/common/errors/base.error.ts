import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

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
  readonly code: string;

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
    code: string,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Maintain proper stack trace for where the error was thrown (V8 engines)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to a NestJS HTTP exception. Metadata stays off the response
   * body on purpose — it may carry internals (raw driver errors, queries)
   * and is only meant for server-side logging and Sentry.
   */
  toHttpException() {
    const body = {
      code: this.code,
      message: this.message,
    };

    const factory = EXCEPTION_FACTORIES[this.statusCode];
    return factory ? factory(body) : new BadRequestException(body);
  }
}

// The value type includes undefined because not every status code has a
// dedicated factory — lookups for unmapped codes fall back to 400.
const EXCEPTION_FACTORIES: Record<
  number,
  ((body: object) => HttpException) | undefined
> = {
  401: (body) => new UnauthorizedException(body),
  403: (body) => new ForbiddenException(body),
  404: (body) => new NotFoundException(body),
  409: (body) => new ConflictException(body),
  // Nest ships no TooManyRequestsException; use the generic base.
  429: (body) => new HttpException(body, HttpStatus.TOO_MANY_REQUESTS),
  500: (body) => new InternalServerErrorException(body),
  501: (body) => new NotImplementedException(body),
  503: (body) => new ServiceUnavailableException(body),
  504: (body) => new GatewayTimeoutException(body),
};
