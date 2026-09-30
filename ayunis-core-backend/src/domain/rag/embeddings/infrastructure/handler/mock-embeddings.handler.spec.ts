import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';
import { MockEmbeddingsHandler } from './mock-embeddings.handler';

describe('MockEmbeddingsHandler', () => {
  const model = new EmbeddingModel({
    name: 'mock-embedding',
    provider: ModelProvider.MISTRAL,
    displayName: 'Mock embedding',
    dimensions: EmbeddingDimensions.DIMENSION_1024,
    isArchived: false,
  });

  it('returns one correctly sized deterministic embedding per input', async () => {
    const handler = new MockEmbeddingsHandler();

    const embeddings = await handler.embed(['first', 'second'], model);

    expect(embeddings).toHaveLength(2);
    expect(embeddings.map((embedding) => embedding.text)).toEqual([
      'first',
      'second',
    ]);
    expect(embeddings[0]?.vector).toHaveLength(model.dimensions);
    expect(embeddings[0]?.vector).toEqual(embeddings[1]?.vector);
    expect(embeddings.every((embedding) => embedding.model === model)).toBe(
      true,
    );
  });

  it('is always available', () => {
    expect(new MockEmbeddingsHandler().isAvailable()).toBe(true);
  });
});
