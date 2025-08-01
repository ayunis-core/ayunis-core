import {
  ApplicationError,
  ErrorMetadata,
} from '../../../../common/errors/base.error';
import { SplitterType } from '../domain/splitter-type.enum';

export enum SplitterErrorCode {
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
}

export class SplitterError extends ApplicationError {
  constructor(
    message: string,
    code: SplitterErrorCode,
    status: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, status, metadata);
    this.name = 'SplitterError';
  }
}

export class SplitterProviderNotFoundError extends SplitterError {
  constructor(provider: SplitterType, metadata?: ErrorMetadata) {
    super(
      `Splitter provider not found: ${provider}`,
      SplitterErrorCode.PROVIDER_NOT_FOUND,
      404,
      { provider, ...metadata },
    );
    this.name = 'SplitterProviderNotFoundError';
  }
}

export class NoSplitterProviderAvailableError extends SplitterError {
  constructor(provider: SplitterType, metadata?: ErrorMetadata) {
    super(
      `Splitter provider is not available: ${provider}`,
      SplitterErrorCode.PROVIDER_NOT_AVAILABLE,
      503,
      { provider, ...metadata },
    );
    this.name = 'NoSplitterProviderAvailableError';
  }
}

export class SplitterProcessingError extends SplitterError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, SplitterErrorCode.PROCESSING_FAILED, 500, metadata);
    this.name = 'SplitterProcessingError';
  }
}
