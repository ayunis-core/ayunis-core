import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Error codes specific to the file retriever domain
 */
export enum FileRetrieverErrorCode {
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  RETRIEVAL_FAILED = 'RETRIEVAL_FAILED',
  UNPROCESSABLE_DOCUMENT = 'UNPROCESSABLE_DOCUMENT',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOO_MANY_PAGES = 'TOO_MANY_PAGES',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Base file retriever error that all file retriever-specific errors should extend
 */
export abstract class FileRetrieverError extends ApplicationError {
  constructor(
    message: string,
    code: FileRetrieverErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class FileRetrieverProviderNotAvailableError extends FileRetrieverError {
  constructor(providerName: string, metadata?: ErrorMetadata) {
    super(
      `File retriever provider '${providerName}' is not available or configured properly`,
      FileRetrieverErrorCode.PROVIDER_NOT_AVAILABLE,
      500,
      metadata,
    );
  }
}

/**
 * Extraction failed for a reason on our side of the boundary — the converter
 * being unreachable, an empty provider response — so it stays 500 and alerts
 * on first occurrence. A file we simply cannot read is
 * {@link UnprocessableDocumentError} instead.
 */
export class FileRetrievalFailedError extends FileRetrieverError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, FileRetrieverErrorCode.RETRIEVAL_FAILED, 500, metadata);
  }
}

/**
 * The uploaded document itself cannot be processed — corrupt, malformed, or
 * refused outright by OCR or the converter. 422 is load-bearing: it is what
 * `isExpectedFailure` reads to keep a user's broken file out of AppSignal, and
 * what makes `classifyJobFailure` settle the source as FAILED immediately
 * rather than spending two more attempts re-sending a file that can never
 * parse (AYC-538).
 */
export class UnprocessableDocumentError extends FileRetrieverError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(
      message,
      FileRetrieverErrorCode.UNPROCESSABLE_DOCUMENT,
      422,
      metadata,
    );
  }
}

export class FileRetrieverUnexpectedError extends FileRetrieverError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, FileRetrieverErrorCode.UNEXPECTED_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}

export class InvalidFileTypeError extends FileRetrieverError {
  constructor(fileType: string, metadata?: ErrorMetadata) {
    super(
      `${fileType} type is currently not supported.`,
      FileRetrieverErrorCode.INVALID_FILE_TYPE,
      400,
      metadata,
    );
  }
}

export class FileTooLargeError extends FileRetrieverError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'File exceeds maximum size limit (50MB)',
      FileRetrieverErrorCode.FILE_TOO_LARGE,
      413,
      metadata,
    );
  }
}

export class TooManyPagesError extends FileRetrieverError {
  constructor(
    metadata?: ErrorMetadata & { pageCount?: number; maxPages?: number },
  ) {
    super(
      metadata?.pageCount && metadata.maxPages
        ? `This document has ${metadata.pageCount} pages; the maximum is ${metadata.maxPages}.`
        : 'This document has too many pages to be processed.',
      FileRetrieverErrorCode.TOO_MANY_PAGES,
      422,
      metadata,
    );
  }
}

export class FileRetrieverUnauthorizedError extends FileRetrieverError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Invalid or missing API key for document processing service',
      FileRetrieverErrorCode.UNAUTHORIZED,
      401,
      metadata,
    );
  }
}
