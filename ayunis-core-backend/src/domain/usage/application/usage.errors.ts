import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import { UUID } from 'crypto';

export enum UsageErrorCode {
  USAGE_NOT_FOUND = 'USAGE_NOT_FOUND',
  INVALID_USAGE_DATA = 'INVALID_USAGE_DATA',
  USAGE_COLLECTION_FAILED = 'USAGE_COLLECTION_FAILED',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_PAGINATION = 'INVALID_PAGINATION',
}

export abstract class UsageError extends ApplicationError {
  constructor(
    message: string,
    code: UsageErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UsageNotFoundError extends UsageError {
  constructor(usageId: UUID, metadata?: ErrorMetadata) {
    super(
      `Usage record '${usageId}' not found`,
      UsageErrorCode.USAGE_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class InvalidUsageDataError extends UsageError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, UsageErrorCode.INVALID_USAGE_DATA, 400, metadata);
  }
}

export class UsageCollectionFailedError extends UsageError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(
      `Usage collection failed: ${message}`,
      UsageErrorCode.USAGE_COLLECTION_FAILED,
      500,
      metadata,
    );
  }
}

export class InvalidDateRangeError extends UsageError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(
      `Invalid date range: ${message}`,
      UsageErrorCode.INVALID_DATE_RANGE,
      400,
      metadata,
    );
  }
}

export class InvalidPaginationError extends UsageError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(
      `Invalid pagination: ${message}`,
      UsageErrorCode.INVALID_PAGINATION,
      400,
      metadata,
    );
  }
}
