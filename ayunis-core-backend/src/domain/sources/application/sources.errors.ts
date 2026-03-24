import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum SourceErrorCode {
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  UNEXPECTED_SOURCE_ERROR = 'UNEXPECTED_SOURCE_ERROR',
  INVALID_SOURCE_TYPE = 'INVALID_SOURCE_TYPE',
  EMPTY_FILE_DATA = 'EMPTY_FILE_DATA',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
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

export class EmptyFileDataError extends SourceError {
  constructor(fileName: string, metadata?: ErrorMetadata) {
    super(
      `The file '${fileName}' contains no processable data`,
      SourceErrorCode.EMPTY_FILE_DATA,
      400,
      { fileName, ...metadata },
    );
  }
}

export class UnsupportedFileTypeError extends SourceError {
  constructor(
    fileType: string,
    supportedTypes: string[],
    metadata?: ErrorMetadata,
  ) {
    super(
      `File type '${fileType}' is not supported. Supported types: ${supportedTypes.join(', ')}`,
      SourceErrorCode.UNSUPPORTED_FILE_TYPE,
      400,
      metadata,
    );
  }
}
