import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum SourceErrorCode {
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  UNEXPECTED_SOURCE_ERROR = 'UNEXPECTED_SOURCE_ERROR',
  INVALID_SOURCE_TYPE = 'INVALID_SOURCE_TYPE',
  EMPTY_FILE_DATA = 'EMPTY_FILE_DATA',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  UNSUPPORTED_SOURCE_FILE_TYPE = 'UNSUPPORTED_SOURCE_FILE_TYPE',
  SPREADSHEET_PARSE_TIMEOUT = 'SPREADSHEET_PARSE_TIMEOUT',
  UNPROCESSABLE_SPREADSHEET = 'UNPROCESSABLE_SPREADSHEET',
  SOURCE_NOT_READY = 'SOURCE_NOT_READY',
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
  // Accepts Error for @HandleUnexpectedErrors; the string form remains for
  // call sites not yet migrated to the decorator. The wrapped error travels
  // on the non-serialized `cause` so raw internals never reach API callers.
  constructor(cause: string | Error, metadata?: ErrorMetadata) {
    if (typeof cause === 'string') {
      super(cause, SourceErrorCode.UNEXPECTED_SOURCE_ERROR, 500, metadata);
      return;
    }

    super(
      'Unexpected error occurred',
      SourceErrorCode.UNEXPECTED_SOURCE_ERROR,
      500,
      metadata,
    );
    this.cause = cause;
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

export class SourceNotReadyError extends SourceError {
  constructor(sourceId: string, metadata?: ErrorMetadata) {
    super(
      `Source '${sourceId}' is still processing or failed and has no data yet`,
      SourceErrorCode.SOURCE_NOT_READY,
      409,
      metadata,
    );
  }
}

export class SpreadsheetParseTimeoutError extends SourceError {
  constructor(timeoutMs: number, metadata?: ErrorMetadata) {
    super(
      `Spreadsheet could not be parsed within ${timeoutMs / 1000} seconds`,
      SourceErrorCode.SPREADSHEET_PARSE_TIMEOUT,
      422,
      metadata,
    );
  }
}

export class UnprocessableSpreadsheetError extends SourceError {
  constructor(cause: Error, metadata?: ErrorMetadata) {
    super(
      'The spreadsheet is malformed, encrypted, or cannot be read',
      SourceErrorCode.UNPROCESSABLE_SPREADSHEET,
      422,
      metadata,
    );
    this.cause = cause;
  }
}

export class UnsupportedSourceFileTypeError extends SourceError {
  constructor(mimeType: string, metadata?: ErrorMetadata) {
    super(
      `Unsupported file type: '${mimeType}'`,
      SourceErrorCode.UNSUPPORTED_SOURCE_FILE_TYPE,
      400,
      metadata,
    );
  }
}
