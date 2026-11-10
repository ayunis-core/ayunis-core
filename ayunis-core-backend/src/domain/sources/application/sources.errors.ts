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
  SPREADSHEET_TOO_LARGE = 'SPREADSHEET_TOO_LARGE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  SOURCE_UPLOAD_NOT_FOUND = 'SOURCE_UPLOAD_NOT_FOUND',
  SOURCE_UPLOAD_EXPIRED = 'SOURCE_UPLOAD_EXPIRED',
  SOURCE_UPLOAD_INCOMPLETE = 'SOURCE_UPLOAD_INCOMPLETE',
  SOURCE_UPLOAD_TARGET_MISMATCH = 'SOURCE_UPLOAD_TARGET_MISMATCH',
  SOURCE_UPLOAD_REQUEST_NOT_ALLOWED = 'SOURCE_UPLOAD_REQUEST_NOT_ALLOWED',
  STORED_FILE_MISMATCH = 'STORED_FILE_MISMATCH',
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

export class SpreadsheetTooLargeError extends SourceError {
  constructor(maxCells: number, metadata?: ErrorMetadata) {
    super(
      `The spreadsheet's data spans more than ${maxCells.toLocaleString('en-US')} cells. Remove unused rows and columns or split it into smaller files.`,
      SourceErrorCode.SPREADSHEET_TOO_LARGE,
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

export class FileTooLargeError extends SourceError {
  constructor(maxFileSizeBytes: number, metadata?: ErrorMetadata) {
    super(
      `File exceeds the ${Math.floor(maxFileSizeBytes / (1024 * 1024))} MB upload limit`,
      SourceErrorCode.FILE_TOO_LARGE,
      413,
      { maxFileSizeBytes, ...metadata },
    );
  }
}

/** Also raised for sessions owned by someone else, so existence never leaks. */
export class SourceUploadNotFoundError extends SourceError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' not found`,
      SourceErrorCode.SOURCE_UPLOAD_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class SourceUploadExpiredError extends SourceError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' has expired or was aborted`,
      SourceErrorCode.SOURCE_UPLOAD_EXPIRED,
      410,
      metadata,
    );
  }
}

/** The object is missing or its size differs from what the session announced. */
export class SourceUploadIncompleteError extends SourceError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' has not been fully transferred`,
      SourceErrorCode.SOURCE_UPLOAD_INCOMPLETE,
      409,
      metadata,
    );
  }
}

export class SourceUploadTargetMismatchError extends SourceError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' was created for a different target`,
      SourceErrorCode.SOURCE_UPLOAD_TARGET_MISMATCH,
      400,
      metadata,
    );
  }
}

/** The requested S3 operation does not fit the session's transfer mode. */
export class SourceUploadRequestNotAllowedError extends SourceError {
  constructor(uploadId: string, metadata?: ErrorMetadata) {
    super(
      `Upload '${uploadId}' does not allow this request`,
      SourceErrorCode.SOURCE_UPLOAD_REQUEST_NOT_ALLOWED,
      400,
      metadata,
    );
  }
}

/**
 * The stored object is not the one upload completion verified (its size
 * differs), so processing must not read it.
 */
export class StoredFileMismatchError extends SourceError {
  constructor(storageKey: string, metadata?: ErrorMetadata) {
    super(
      'The stored file no longer matches the verified upload',
      SourceErrorCode.STORED_FILE_MISMATCH,
      409,
      { storageKey, ...metadata },
    );
  }
}
