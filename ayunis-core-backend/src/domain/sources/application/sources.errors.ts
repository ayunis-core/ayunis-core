import { ApplicationError, ErrorMetadata } from 'src/common/errors/base.error';

export enum SourceErrorCode {
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  UNEXPECTED_SOURCE_ERROR = 'UNEXPECTED_SOURCE_ERROR',
  INVALID_SOURCE_TYPE = 'INVALID_SOURCE_TYPE',
}

export abstract class SourceError extends ApplicationError {
  constructor(
    message: string,
    code: SourceErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class InvalidSourceTypeError extends SourceError {
  constructor(sourceType: string, metadata?: ErrorMetadata) {
    super(
      `Invalid source type: ${sourceType}`,
      SourceErrorCode.INVALID_SOURCE_TYPE,
      400,
      metadata,
    );
  }
}

export class SourceNotFoundError extends SourceError {
  constructor(sourceId: string, metadata?: ErrorMetadata) {
    super(
      `Source with ID '${sourceId}' not found`,
      SourceErrorCode.SOURCE_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class UnexpectedSourceError extends SourceError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, SourceErrorCode.UNEXPECTED_SOURCE_ERROR, 500, metadata);
  }
}
