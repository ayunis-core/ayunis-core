import { firstValueFrom, throwError } from 'rxjs';
import { StreamInferenceUseCase } from './stream-inference.use-case';
import { StreamInferenceInput } from '../../ports/stream-inference.handler';
import {
  InferenceAbortedError,
  InferenceFailedError,
  ModelRateLimitExceededError,
} from '../../models.errors';
import type { Model } from 'src/domain/models/domain/model.entity';

const model = {
  name: 'claude-sonnet-4',
  provider: 'anthropic',
} as unknown as Model;

function makeInput(): StreamInferenceInput {
  return new StreamInferenceInput({
    model,
    messages: [],
    systemPrompt: 'You are a helpful municipal assistant.',
    orgId: '123e4567-e89b-12d3-a456-426614174000',
  });
}

function useCaseWithFailingHandler(error: unknown): StreamInferenceUseCase {
  const registry = {
    getHandler: () => ({ answer: () => throwError(() => error) }),
  };
  return new StreamInferenceUseCase(registry as never);
}

describe('StreamInferenceUseCase error mapping', () => {
  it('maps client-abort DOMExceptions to InferenceAbortedError', async () => {
    const abort = new DOMException('This operation was aborted', 'AbortError');

    await expect(
      firstValueFrom(useCaseWithFailingHandler(abort).execute(makeInput())),
    ).rejects.toBeInstanceOf(InferenceAbortedError);
  });

  it('marks aborts with a sub-500 status so the error filter treats them as expected', async () => {
    const abort = new DOMException('This operation was aborted', 'AbortError');

    await expect(
      firstValueFrom(useCaseWithFailingHandler(abort).execute(makeInput())),
    ).rejects.toMatchObject({ code: 'INFERENCE_ABORTED', statusCode: 499 });
  });

  it('maps plain errors named AbortError (non-DOMException SDK aborts) to InferenceAbortedError', async () => {
    const abort = new Error('Request was aborted.');
    abort.name = 'AbortError';

    await expect(
      firstValueFrom(useCaseWithFailingHandler(abort).execute(makeInput())),
    ).rejects.toBeInstanceOf(InferenceAbortedError);
  });

  it('still maps other provider failures to InferenceFailedError', async () => {
    const providerError = new Error('fetch failed: ECONNRESET');

    await expect(
      firstValueFrom(
        useCaseWithFailingHandler(providerError).execute(makeInput()),
      ),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });

  it('passes ApplicationErrors through unchanged', async () => {
    const rateLimit = new ModelRateLimitExceededError('anthropic');

    await expect(
      firstValueFrom(useCaseWithFailingHandler(rateLimit).execute(makeInput())),
    ).rejects.toBe(rateLimit);
  });
});
