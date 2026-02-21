import { handleEmbeddingError } from './embedding-error.utils';
import { ToolExecutionFailedError } from '../tools.errors';
import { ModelNotFoundByIdError } from 'src/domain/models/application/models.errors';
import {
  EmbeddingsProviderNotFoundError,
  NoEmbeddingsProviderAvailableError,
} from 'src/domain/rag/embeddings/application/embeddings.errors';
import { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';
import { randomUUID } from 'crypto';

describe('handleEmbeddingError', () => {
  const toolName = 'knowledge_query';

  it('should throw exposeToLLM error for ModelNotFoundByIdError', () => {
    const error = new ModelNotFoundByIdError(randomUUID());

    try {
      handleEmbeddingError(error, toolName);
      fail('Expected ToolExecutionFailedError');
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(ToolExecutionFailedError);
      expect((thrown as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((thrown as ToolExecutionFailedError).message).toContain(
        'No embedding model is available',
      );
    }
  });

  it('should throw exposeToLLM error for EmbeddingsProviderNotFoundError', () => {
    const error = new EmbeddingsProviderNotFoundError(
      EmbeddingsProvider.OPENAI,
    );

    try {
      handleEmbeddingError(error, toolName);
      fail('Expected ToolExecutionFailedError');
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(ToolExecutionFailedError);
      expect((thrown as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((thrown as ToolExecutionFailedError).message).toContain(
        'embedding provider is not configured',
      );
    }
  });

  it('should throw exposeToLLM error for NoEmbeddingsProviderAvailableError', () => {
    const error = new NoEmbeddingsProviderAvailableError(
      EmbeddingsProvider.OPENAI,
    );

    try {
      handleEmbeddingError(error, toolName);
      fail('Expected ToolExecutionFailedError');
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(ToolExecutionFailedError);
      expect((thrown as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((thrown as ToolExecutionFailedError).message).toContain(
        'embedding provider is not available',
      );
    }
  });

  it('should throw exposeToLLM error for vector dimension mismatch', () => {
    const error = new Error('Query has different vector dimensions than index');

    try {
      handleEmbeddingError(error, toolName);
      fail('Expected ToolExecutionFailedError');
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(ToolExecutionFailedError);
      expect((thrown as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((thrown as ToolExecutionFailedError).message).toContain(
        'different embedding model',
      );
    }
  });

  it('should throw non-exposed error for unknown errors', () => {
    const error = new Error('Something unexpected happened');

    try {
      handleEmbeddingError(error, toolName);
      fail('Expected ToolExecutionFailedError');
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(ToolExecutionFailedError);
      expect((thrown as ToolExecutionFailedError).exposeToLLM).toBe(false);
    }
  });
});
