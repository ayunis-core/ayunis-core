import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { EMPTY, firstValueFrom, throwError } from 'rxjs';
import { randomUUID } from 'crypto';
import { StreamInferenceUseCase } from './stream-inference.use-case';
import { StreamInferenceInput } from '../../ports/stream-inference.handler';
import {
  InferenceAbortedError,
  InferenceFailedError,
  ModelRateLimitExceededError,
} from '../../models.errors';
import type { Model } from 'src/domain/models/domain/model.entity';
import {
  ProviderConnectionError,
  ProviderServerError,
} from 'src/common/errors/provider.errors';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';

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
  return new StreamInferenceUseCase(createPinoLoggerMock(), registry as never);
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

  it('wraps transport failures as ProviderConnectionError with provider and model', async () => {
    const transport = Object.assign(new Error('read ECONNRESET'), {
      code: 'ECONNRESET',
    });

    const result = firstValueFrom(
      useCaseWithFailingHandler(transport).execute(makeInput()),
    );
    await expect(result).rejects.toBeInstanceOf(ProviderConnectionError);
    await expect(result).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_ANTHROPIC',
      context: {
        provider: 'anthropic',
        modelId: 'claude-sonnet-4',
        underlyingCode: 'ECONNRESET',
      },
    });
  });

  it('wraps upstream 5xx responses as ProviderServerError', async () => {
    const upstream = Object.assign(new Error('service unavailable'), {
      status: 503,
    });

    await expect(
      firstValueFrom(useCaseWithFailingHandler(upstream).execute(makeInput())),
    ).rejects.toBeInstanceOf(ProviderServerError);
  });

  it('keeps upstream 4xx responses as InferenceFailedError — potentially our bug', async () => {
    const upstream = Object.assign(new Error('invalid request'), {
      status: 400,
    });

    await expect(
      firstValueFrom(useCaseWithFailingHandler(upstream).execute(makeInput())),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });

  it('maps aborts to InferenceAbortedError even when a transport code is attached', async () => {
    const abort = Object.assign(new Error('aborted'), {
      name: 'AbortError',
      code: 'ECONNRESET',
    });

    await expect(
      firstValueFrom(useCaseWithFailingHandler(abort).execute(makeInput())),
    ).rejects.toBeInstanceOf(InferenceAbortedError);
  });

  it('passes ApplicationErrors through unchanged', async () => {
    const rateLimit = new ModelRateLimitExceededError('anthropic');

    await expect(
      firstValueFrom(useCaseWithFailingHandler(rateLimit).execute(makeInput())),
    ).rejects.toBe(rateLimit);
  });
});

describe('StreamInferenceUseCase replayed message sanitation', () => {
  it('strips schema-disallowed nulls from replayed tool calls before dispatch', () => {
    const tool: ToolSchema = {
      name: 'search',
      description: 'Search',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' }, date: { type: 'string' } },
      },
    };
    const history = new AssistantMessage({
      threadId: randomUUID(),
      content: [
        new ToolUseMessageContent('call-1', 'search', {
          name: 'x',
          date: null,
        }),
      ],
    });
    let received: StreamInferenceInput | undefined;
    const registry = {
      getHandler: () => ({
        answer: (input: StreamInferenceInput) => {
          received = input;
          return EMPTY;
        },
      }),
    };
    const useCase = new StreamInferenceUseCase(
      createPinoLoggerMock(),
      registry as never,
    );

    useCase.execute(
      new StreamInferenceInput({
        model,
        messages: [history],
        systemPrompt: '',
        tools: [tool],
        orgId: '123e4567-e89b-12d3-a456-426614174000',
      }),
    );

    const receivedToolUse = (received?.messages[0] as AssistantMessage)
      .content[0] as ToolUseMessageContent;
    expect(receivedToolUse.params).toEqual({ name: 'x' });
    expect(history.content[0]).toMatchObject({
      params: { name: 'x', date: null },
    });
  });
});
