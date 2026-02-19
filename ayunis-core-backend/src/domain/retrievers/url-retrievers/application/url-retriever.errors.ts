import type { ErrorMetadata } from '../../../../common/errors/base.error';
import { ApplicationError } from '../../../../common/errors/base.error';
import {
  NotFoundException,
  InternalServerErrorException,
  RequestTimeoutException,
} from '@nestjs/common';

/**
 * Error codes specific to the URL retriever domain
 */
export enum UrlRetrieverErrorCode {
  RETRIEVAL_FAILED = 'RETRIEVAL_FAILED',
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  TIMEOUT = 'TIMEOUT',
  HTTP_ERROR = 'HTTP_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
}

/**
 * Base URL retriever error that all URL retriever-specific errors should extend
 */
export abstract class UrlRetrieverError extends ApplicationError {
  constructor(
    message: string,
    code: UrlRetrieverErrorCode,
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
      case 408:
        return new RequestTimeoutException({
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

export class UrlRetrieverRetrievalError extends UrlRetrieverError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, UrlRetrieverErrorCode.RETRIEVAL_FAILED, 500, metadata);
    this.name = 'UrlRetrieverRetrievalError';
  }
}

export class UrlRetrieverProviderNotAvailableError extends UrlRetrieverError {
  constructor(providerName: string, metadata?: ErrorMetadata) {
    super(
      `URL retriever provider '${providerName}' is not available or configured properly`,
      UrlRetrieverErrorCode.PROVIDER_NOT_AVAILABLE,
      500,
      metadata,
    );
    this.name = 'UrlRetrieverProviderNotAvailableError';
  }
}

export class UrlRetrieverTimeoutError extends UrlRetrieverError {
  constructor(url: string, timeoutMs: number, metadata?: ErrorMetadata) {
    super(
      `Request to '${url}' timed out after ${timeoutMs}ms`,
      UrlRetrieverErrorCode.TIMEOUT,
      408,
      metadata,
    );
    this.name = 'UrlRetrieverTimeoutError';
  }
}

export class UrlRetrieverHttpError extends UrlRetrieverError {
  constructor(url: string, statusCode: number, metadata?: ErrorMetadata) {
    super(
      `HTTP error when retrieving '${url}': ${statusCode}`,
      UrlRetrieverErrorCode.HTTP_ERROR,
      500,
      metadata,
    );
    this.name = 'UrlRetrieverHttpError';
  }
}

export class UrlRetrieverParsingError extends UrlRetrieverError {
  constructor(url: string, message: string, metadata?: ErrorMetadata) {
    super(
      `Failed to parse content from '${url}': ${message}`,
      UrlRetrieverErrorCode.PARSING_ERROR,
      500,
      metadata,
    );
    this.name = 'UrlRetrieverParsingError';
  }
}
