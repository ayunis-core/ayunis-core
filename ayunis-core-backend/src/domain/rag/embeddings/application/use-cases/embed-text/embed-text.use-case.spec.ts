import { EmbedTextUseCase } from './embed-text.use-case';
import { EmbedTextCommand } from './embed-text.command';
import { NoEmbeddingsReturnedError } from '../../embeddings.errors';
import {
  ProviderConnectionError,
  ProviderServerError,
} from 'src/common/errors/provider.errors';
import type { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';

const model = {
  name: 'mistral-embed',
  provider: 'mistral',
} as unknown as EmbeddingModel;

function makeCommand(): EmbedTextCommand {
  return new EmbedTextCommand({
    model,
    texts: ['Wie beantrage ich einen Anwohnerparkausweis?'],
    orgId: '123e4567-e89b-12d3-a456-426614174000',
  });
}

function useCaseWithFailingHandler(error: Error): EmbedTextUseCase {
  const registry = {
    getHandler: () => ({ embed: () => Promise.reject(error) }),
  };
  // Pass the work function through unchanged — rejections must surface
  // through throttle.run exactly as they do in production.
  const throttle = {
    run: (_priority: unknown, fn: () => Promise<unknown>) => fn(),
  };
  return new EmbedTextUseCase(registry as never, throttle as never);
}

describe('EmbedTextUseCase error mapping', () => {
  it('passes ApplicationErrors through unchanged', async () => {
    const domainError = new NoEmbeddingsReturnedError('mistral');

    await expect(
      useCaseWithFailingHandler(domainError).execute(makeCommand()),
    ).rejects.toBe(domainError);
  });

  it('wraps transport failures from the throttled handler as ProviderConnectionError', async () => {
    // Regression guard: `return this.throttle.run(...)` without await let
    // rejections bypass the catch block entirely.
    const transport = Object.assign(new Error('read ECONNRESET'), {
      code: 'ECONNRESET',
    });

    const result = useCaseWithFailingHandler(transport).execute(makeCommand());
    await expect(result).rejects.toBeInstanceOf(ProviderConnectionError);
    await expect(result).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_MISTRAL',
      context: {
        provider: 'mistral',
        modelId: 'mistral-embed',
        underlyingCode: 'ECONNRESET',
      },
    });
  });

  it('wraps upstream 5xx responses as ProviderServerError', async () => {
    const upstream = Object.assign(new Error('service unavailable'), {
      statusCode: 503,
    });

    await expect(
      useCaseWithFailingHandler(upstream).execute(makeCommand()),
    ).rejects.toBeInstanceOf(ProviderServerError);
  });

  it('rethrows unrecognized errors raw so internal bugs stay distinct', async () => {
    const internal = new Error('cannot read properties of undefined');

    await expect(
      useCaseWithFailingHandler(internal).execute(makeCommand()),
    ).rejects.toBe(internal);
  });
});
