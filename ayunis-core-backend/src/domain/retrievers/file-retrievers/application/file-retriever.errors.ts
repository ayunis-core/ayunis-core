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
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
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
      default:
        return new InternalServerErrorException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

export class FileRetrieverProcessingError extends FileRetrieverError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, FileRetrieverErrorCode.PROCESSING_FAILED, 500, metadata);
    this.name = 'FileRetrieverProcessingError';
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
    this.name = 'FileRetrieverProviderNotAvailableError';
  }
}
