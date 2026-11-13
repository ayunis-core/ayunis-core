import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
import type { UUID } from 'crypto';
import { PrepareEmbeddingsUseCase } from './prepare-embeddings.use-case';
import { PrepareEmbeddingsCommand } from './prepare-embeddings.command';
import type { ChildChunkEmbedder } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/services/child-chunk-embedder.service';
import type { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

const MODEL = {
  id: '11111111-1111-1111-1111-111111111111' as UUID,
  name: 'mistral-embed',
  provider: ModelProvider.MISTRAL,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
};

describe('PrepareEmbeddingsUseCase', () => {
  const embedder = {
    childTexts: jest.fn((content: string) => content.split('|')),
    embed: jest.fn((texts: string[]) =>
      Promise.resolve(texts.map((text) => [text.length])),
    ),
  };
  const getModel = { execute: jest.fn().mockResolvedValue({ model: MODEL }) };
  const useCase = new PrepareEmbeddingsUseCase(
    embedder as unknown as ChildChunkEmbedder,
    getModel as unknown as GetPermittedEmbeddingModelUseCase,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns one vector for every child text of the given parent chunks', async () => {
    const vectors = await useCase.execute(
      new PrepareEmbeddingsCommand({
        orgId: ORG_ID,
        contents: ['Haushalt|Stellenplan', 'Satzung'],
      }),
    );

    expect(embedder.embed).toHaveBeenCalledWith(
      ['Haushalt', 'Stellenplan', 'Satzung'],
      MODEL,
      ORG_ID,
    );
    expect([...vectors!.vectorsByText]).toEqual([
      ['Haushalt', [8]],
      ['Stellenplan', [11]],
      ['Satzung', [7]],
    ]);
  });

  it('asks nothing of the provider or the model lookup when there is no text', async () => {
    embedder.childTexts.mockReturnValueOnce([]);

    const vectors = await useCase.execute(
      new PrepareEmbeddingsCommand({ orgId: ORG_ID, contents: [''] }),
    );

    expect(vectors).toBeUndefined();
    expect(getModel.execute).not.toHaveBeenCalled();
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('lets a provider failure reach the caller', async () => {
    embedder.embed.mockRejectedValueOnce(
      new ProviderTimeoutError({ provider: 'mistral' }),
    );

    await expect(
      useCase.execute(
        new PrepareEmbeddingsCommand({ orgId: ORG_ID, contents: ['a'] }),
      ),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
  });
});
