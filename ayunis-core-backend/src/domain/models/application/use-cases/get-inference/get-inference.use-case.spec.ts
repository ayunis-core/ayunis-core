import { GetInferenceUseCase } from './get-inference.use-case';
import { GetInferenceCommand } from './get-inference.command';
import {
  InferenceFailedError,
  ModelRateLimitExceededError,
} from '../../models.errors';
import {
  ProviderConnectionError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';

const model = {
  name: 'mistral-large-latest',
  provider: 'mistral',
} as unknown as LanguageModel;

function makeCommand(): GetInferenceCommand {
  return new GetInferenceCommand({
    model,
    messages: [],
    tools: [],
    toolChoice: ModelToolChoice.AUTO,
    instructions: 'You are a helpful municipal assistant.',
  });
}

function useCaseWithFailingHandler(error: Error): GetInferenceUseCase {
  const registry = {
    getHandler: () => ({ answer: () => Promise.reject(error) }),
  };
  const contextService = {
    get: () => '123e4567-e89b-12d3-a456-426614174000',
  };
  return new GetInferenceUseCase(registry as never, contextService as never);
}

describe('GetInferenceUseCase error mapping', () => {
  it('passes ApplicationErrors through unchanged', async () => {
    const rateLimit = new ModelRateLimitExceededError('mistral');

    await expect(
      useCaseWithFailingHandler(rateLimit).execute(makeCommand()),
    ).rejects.toBe(rateLimit);
  });

  it('wraps transport failures as ProviderConnectionError with provider and model', async () => {
    const transport = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
      code: 'ENOTFOUND',
      hostname: 'api.mistral.ai',
    });

    const result = useCaseWithFailingHandler(transport).execute(makeCommand());
    await expect(result).rejects.toBeInstanceOf(ProviderConnectionError);
    await expect(result).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_MISTRAL',
      context: {
        provider: 'mistral',
        modelId: 'mistral-large-latest',
        underlyingCode: 'ENOTFOUND',
        host: 'api.mistral.ai',
      },
    });
  });

  it('wraps upstream 5xx responses as ProviderServerError', async () => {
    const upstream = Object.assign(new Error('bad gateway'), { status: 502 });

    await expect(
      useCaseWithFailingHandler(upstream).execute(makeCommand()),
    ).rejects.toBeInstanceOf(ProviderServerError);
  });

  it('wraps upstream 504 as ProviderTimeoutError', async () => {
    const upstream = Object.assign(new Error('gateway timeout'), {
      status: 504,
    });

    await expect(
      useCaseWithFailingHandler(upstream).execute(makeCommand()),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it('keeps upstream 4xx responses as InferenceFailedError — potentially our bug', async () => {
    const upstream = Object.assign(new Error('invalid request'), {
      status: 422,
    });

    await expect(
      useCaseWithFailingHandler(upstream).execute(makeCommand()),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });

  it('maps unrecognized errors to InferenceFailedError', async () => {
    await expect(
      useCaseWithFailingHandler(new Error('boom')).execute(makeCommand()),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });
});
