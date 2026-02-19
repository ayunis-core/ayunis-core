import type { ErrorMetadata } from '../../../../common/errors/base.error';
import { ApplicationError } from '../../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';

/**
 * Error codes specific to the file retriever domain
 */
export enum FileRetrieverErrorCode {
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  RETRIEVAL_FAILED = 'RETRIEVAL_FAILED',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOO_MANY_PAGES = 'TOO_MANY_PAGES',
  SERVICE_BUSY = 'SERVICE_BUSY',
  SERVICE_TIMEOUT = 'SERVICE_TIMEOUT',
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

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    const payload = {
      code: this.code,
      message: this.message,
      ...(this.metadata && { metadata: this.metadata }),
    };

    switch (this.statusCode) {
      case 400:
        return new BadRequestException(payload);
      case 401:
        return new UnauthorizedException(payload);
      case 404:
        return new NotFoundException(payload);
      case 413:
        return new PayloadTooLargeException(payload);
      case 422:
        return new UnprocessableEntityException(payload);
      case 500:
        return new InternalServerErrorException(payload);
      case 503:
        return new ServiceUnavailableException(payload);
      case 504:
        return new GatewayTimeoutException(payload);
      default:
        return new InternalServerErrorException(payload);
    }
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

export class FileRetrievalFailedError extends FileRetrieverError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, FileRetrieverErrorCode.RETRIEVAL_FAILED, 500, metadata);
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
  constructor(metadata?: ErrorMetadata) {
    super(
      'Document rejected by preflight check (too many pages)',
      FileRetrieverErrorCode.TOO_MANY_PAGES,
      422,
      metadata,
    );
  }
}

export class ServiceBusyError extends FileRetrieverError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Document processing service is busy. Please try again later.',
      FileRetrieverErrorCode.SERVICE_BUSY,
      503,
      metadata,
    );
  }
}

export class ServiceTimeoutError extends FileRetrieverError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Document conversion exceeded timeout',
      FileRetrieverErrorCode.SERVICE_TIMEOUT,
      504,
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
