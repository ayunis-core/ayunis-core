export type ErrorCode = string;

export interface ErrorMetadata {
  [key: string]: any;
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
}
