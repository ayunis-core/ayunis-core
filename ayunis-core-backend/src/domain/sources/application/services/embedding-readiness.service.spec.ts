import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { EmbeddingReadinessService } from './embedding-readiness.service';
import type { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { EmbeddingsHandlerRegistry } from 'src/domain/rag/embeddings/application/embeddings-handler.registry';
import { AssertEmbeddingsProviderAvailableUseCase } from 'src/domain/rag/embeddings/application/use-cases/assert-embeddings-provider-available/assert-embeddings-provider-available.use-case';

describe('EmbeddingReadinessService', () => {
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;

  function serviceFor(
    provider: ModelProvider,
    handlers: Array<[ModelProvider, boolean]>,
  ): EmbeddingReadinessService {
    const registry = new EmbeddingsHandlerRegistry({
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService);
    for (const [registered, available] of handlers) {
      registry.registerHandler(registered, {
        embed: jest.fn(),
        isAvailable: () => available,
      });
    }
    const permitted = new PermittedEmbeddingModel({
      orgId,
      model: new EmbeddingModel({
        name: 'qwen3-embedding:4b',
        provider,
        displayName: 'Qwen3 Embedding 4B',
        dimensions: EmbeddingDimensions.DIMENSION_2560,
        isArchived: false,
      }),
    });
    const getPermittedEmbeddingModel = {
      execute: jest.fn().mockResolvedValue(permitted),
    } as unknown as GetPermittedEmbeddingModelUseCase;
    return new EmbeddingReadinessService(
      getPermittedEmbeddingModel,
      new AssertEmbeddingsProviderAvailableUseCase(registry),
    );
  }

  it('rejects an org whose embedding model uses a provider that cannot embed', async () => {
    const service = serviceFor(ModelProvider.ANTHROPIC, [
      [ModelProvider.OLLAMA, true],
    ]);

    await expect(service.assertOrgCanEmbed(orgId)).rejects.toMatchObject({
      code: 'EMBEDDINGS_PROVIDER_NOT_FOUND',
    });
  });

  it('rejects an org whose embedding provider is not configured', async () => {
    const service = serviceFor(ModelProvider.OLLAMA, [
      [ModelProvider.OLLAMA, false],
    ]);

    await expect(service.assertOrgCanEmbed(orgId)).rejects.toMatchObject({
      code: 'EMBEDDINGS_PROVIDER_NOT_AVAILABLE',
    });
  });

  it('accepts an org whose embedding provider is configured', async () => {
    const service = serviceFor(ModelProvider.OLLAMA, [
      [ModelProvider.OLLAMA, true],
    ]);

    await expect(service.assertOrgCanEmbed(orgId)).resolves.toBeUndefined();
  });
});
