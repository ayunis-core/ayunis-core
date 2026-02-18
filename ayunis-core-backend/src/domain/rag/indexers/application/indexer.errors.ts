import { UUID } from 'crypto';
import { ApplicationError, ErrorMetadata } from 'src/common/errors/base.error';

export enum IndexErrorCode {
  INDEX_NOT_FOUND = 'INDEX_NOT_FOUND',
  UNEXPECTED_INDEX_ERROR = 'UNEXPECTED_INDEX_ERROR',
}

export class IndexError extends ApplicationError {
  constructor(
    message: string,
    code: IndexErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class IndexNotFoundError extends IndexError {
  constructor(indexId: UUID, metadata?: ErrorMetadata) {
    super(
      `Index with id ${indexId} not found`,
      IndexErrorCode.INDEX_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class UnexpectedIndexError extends IndexError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, IndexErrorCode.UNEXPECTED_INDEX_ERROR, 500, metadata);
  }
}
