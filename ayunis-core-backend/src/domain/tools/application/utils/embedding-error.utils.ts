import {
  ModelNotFoundByIdError,
  ModelError,
} from 'src/domain/models/application/models.errors';
import {
  EmbeddingsProviderNotFoundError,
  NoEmbeddingsProviderAvailableError,
  EmbeddingsError,
} from 'src/domain/rag/embeddings/application/embeddings.errors';
import { ToolExecutionFailedError } from '../tools.errors';

export function handleEmbeddingError(error: unknown, toolName: string): never {
  if (error instanceof ModelNotFoundByIdError) {
    throw new ToolExecutionFailedError({
      toolName,
      message:
        'No embedding model is available for your organization. Please contact your administrator to enable an embedding model.',
      exposeToLLM: true,
      metadata: { error: (error as Error).message },
    });
  }

  if (error instanceof EmbeddingsProviderNotFoundError) {
    throw new ToolExecutionFailedError({
      toolName,
      message:
        'The embedding provider is not configured. Please contact your administrator to set up the embedding provider.',
      exposeToLLM: true,
      metadata: { error: (error as Error).message },
    });
  }

  if (error instanceof NoEmbeddingsProviderAvailableError) {
    throw new ToolExecutionFailedError({
      toolName,
      message:
        'The embedding provider is not available. Please check the configuration or contact your administrator.',
      exposeToLLM: true,
      metadata: { error: (error as Error).message },
    });
  }

  if (error instanceof ModelError || error instanceof EmbeddingsError) {
    throw new ToolExecutionFailedError({
      toolName,
      message:
        'There is an issue with the embedding model configuration. Please contact your administrator.',
      exposeToLLM: true,
      metadata: { error: (error as Error).message },
    });
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('different vector dimensions')) {
    throw new ToolExecutionFailedError({
      toolName,
      message:
        'This content was indexed with a different embedding model than is currently configured. Please contact your administrator.',
      exposeToLLM: true,
      metadata: { error: errorMessage },
    });
  }

  throw new ToolExecutionFailedError({
    toolName,
    message: error instanceof Error ? error.message : 'Unknown error',
    exposeToLLM: false,
    metadata: {
      error: error instanceof Error ? error.message : 'Unknown error',
    },
  });
}
