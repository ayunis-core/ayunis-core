import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';

// The provider codes reach upload clients, which map them to a message about
// the organisation's embedding model, so they must not collide with the
// generic PROVIDER_* codes of other modules.
export enum EmbeddingsErrorCode {
  PROVIDER_NOT_FOUND = 'EMBEDDINGS_PROVIDER_NOT_FOUND',
  PROVIDER_NOT_AVAILABLE = 'EMBEDDINGS_PROVIDER_NOT_AVAILABLE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  NO_EMBEDDINGS_RETURNED = 'NO_EMBEDDINGS_RETURNED',
  UNEXPECTED_ERROR = 'UNEXPECTED_EMBEDDINGS_ERROR',
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

export class NoEmbeddingsReturnedError extends EmbeddingsError {
  constructor(provider: EmbeddingsProvider, metadata?: ErrorMetadata) {
    super(
      `No embeddings returned from provider: ${provider}`,
      EmbeddingsErrorCode.NO_EMBEDDINGS_RETURNED,
      500,
      { provider, ...metadata },
    );
    this.name = 'NoEmbeddingsReturnedError';
  }
}

export class UnexpectedEmbeddingsError extends EmbeddingsError {
  constructor(cause: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected error occurred',
      EmbeddingsErrorCode.UNEXPECTED_ERROR,
      500,
      metadata,
    );
    this.name = 'UnexpectedEmbeddingsError';
    this.cause = cause;
  }
}
