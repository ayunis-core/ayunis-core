import {
  ApplicationError,
  ErrorMetadata,
} from '../../../../common/errors/base.error';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Error codes specific to the file retriever domain
 */
export enum FileRetrieverErrorCode {
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  RETRIEVAL_FAILED = 'RETRIEVAL_FAILED',
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
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 500:
        return new InternalServerErrorException({
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
