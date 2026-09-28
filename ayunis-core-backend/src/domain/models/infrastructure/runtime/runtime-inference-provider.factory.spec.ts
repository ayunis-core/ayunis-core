import type { ModelProvider, ProviderChunk } from '@ayunis/inference';
import type { Model } from 'src/domain/models/domain/model.entity';
import type { ChunkTransform } from './chunk-transform';
import { RuntimeInferenceProviderFactory } from './runtime-inference-provider.factory';

class TestFactory extends RuntimeInferenceProviderFactory {
  readonly createProvider = jest.fn((): ModelProvider => ({
    name: 'test:cached',
    async *stream() {
      yield { textDelta: 'a' };
      yield { textDelta: 'b' };
    },
  }));

  protected createChunkTransform(): ChunkTransform {
    let seen = 0;
    return (chunk) => ({ ...chunk, textDelta: `${chunk.textDelta}${++seen}` });
  }
}

const model = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'test-model',
  updatedAt: new Date('2026-01-01T00:00:00Z'),
} as unknown as Model;

async function texts(stream: AsyncIterable<ProviderChunk>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of stream) out.push(chunk.textDelta ?? '');
  return out;
}

describe('RuntimeInferenceProviderFactory', () => {
  it('rebuilds a cached provider only when the model configuration changes', () => {
    const factory = new TestFactory();

    factory.resolveProvider(model);
    factory.resolveProvider(model);
    factory.resolveProvider({
      ...model,
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    });

    expect(factory.createProvider).toHaveBeenCalledTimes(2);
  });

  it('applies a fresh chunk transform to every stream call', async () => {
    const provider = new TestFactory().resolveProvider(model);
    const request = { instructions: '', messages: [], tools: [] };

    expect(await texts(provider.stream(request))).toEqual(['a1', 'b2']);
    expect(await texts(provider.stream(request))).toEqual(['a1', 'b2']);
  });
});
