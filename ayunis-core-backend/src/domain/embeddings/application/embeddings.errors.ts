import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import { EmbeddingsProvider } from '../domain/embeddings-provider.enum';

export enum EmbeddingsErrorCode {
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
}

export class EmbeddingsError extends ApplicationError {
  constructor(
    message: string,
    code: EmbeddingsErrorCode,
    status: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, status, metadata);
    this.name = 'EmbeddingsError';
  }
}

export class EmbeddingsProviderNotFoundError extends EmbeddingsError {
  constructor(provider: EmbeddingsProvider, metadata?: ErrorMetadata) {
    super(
      `Embeddings provider not found: ${provider}`,
      EmbeddingsErrorCode.PROVIDER_NOT_FOUND,
      404,
      { provider, ...metadata },
    );
    this.name = 'EmbeddingsProviderNotFoundError';
  }
}

export class NoEmbeddingsProviderAvailableError extends EmbeddingsError {
  constructor(provider: EmbeddingsProvider, metadata?: ErrorMetadata) {
    super(
      `Embeddings provider is not available: ${provider}`,
      EmbeddingsErrorCode.PROVIDER_NOT_AVAILABLE,
      503,
      { provider, ...metadata },
    );
    this.name = 'NoEmbeddingsProviderAvailableError';
  }
}

export class EmbeddingsProcessingError extends EmbeddingsError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, EmbeddingsErrorCode.PROCESSING_FAILED, 500, metadata);
    this.name = 'EmbeddingsProcessingError';
  }
}
