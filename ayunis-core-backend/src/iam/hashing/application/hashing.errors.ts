import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Error codes specific to the Hashing domain
 */
export enum HashingErrorCode {
  HASHING_FAILED = 'HASHING_FAILED',
  COMPARISON_FAILED = 'COMPARISON_FAILED',
  INVALID_HASH_FORMAT = 'INVALID_HASH_FORMAT',
}

/**
 * Base hashing error that all hashing-specific errors should extend
 */
export abstract class HashingError extends ApplicationError {
  constructor(
    message: string,
    code: HashingErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    switch (this.statusCode) {
      case 400:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new InternalServerErrorException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

/**
 * Error thrown when hashing operation fails
 */
export class HashingFailedError extends HashingError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to hash data: ${reason}`,
      HashingErrorCode.HASHING_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when hash comparison fails
 */
export class ComparisonFailedError extends HashingError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Failed to compare hash: ${reason}`,
      HashingErrorCode.COMPARISON_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when hash format is invalid
 */
export class InvalidHashFormatError extends HashingError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid hash format: ${reason}`,
      HashingErrorCode.INVALID_HASH_FORMAT,
      400,
      metadata,
    );
  }
}
