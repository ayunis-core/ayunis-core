import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import { GetInferenceUseCase } from './get-inference.use-case';
import { GetInferenceCommand } from './get-inference.command';
import {
  InferenceFailedError,
  InferenceTokenLimitError,
  ModelRateLimitExceededError,
} from '../../models.errors';
import {
  ProviderConnectionError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import {
  InferenceResponse,
  type InferenceInput,
} from '../../ports/inference.handler';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';

const model = {
  name: 'mistral-large-latest',
  provider: 'mistral',
} as unknown as LanguageModel;

function makeCommand(acceptTokenLimitCompletion = false): GetInferenceCommand {
  return new GetInferenceCommand({
    model,
    messages: [],
    tools: [],
    toolChoice: ModelToolChoice.AUTO,
    instructions: 'You are a helpful municipal assistant.',
    acceptTokenLimitCompletion,
  });
}

function useCaseWithFailingHandler(error: Error): GetInferenceUseCase {
  const registry = {
    getHandler: () => ({ answer: () => Promise.reject(error) }),
  };
  const contextService = {
    get: () => '123e4567-e89b-12d3-a456-426614174000',
  };
  return new GetInferenceUseCase(
    createPinoLoggerMock(),
    registry as never,
    contextService as never,
  );
}

function useCaseWithResponse(response: InferenceResponse): GetInferenceUseCase {
  const registry = {
    getHandler: () => ({ answer: () => Promise.resolve(response) }),
  };
  const contextService = {
    get: () => '123e4567-e89b-12d3-a456-426614174000',
  };
  return new GetInferenceUseCase(
    createPinoLoggerMock(),
    registry as never,
    contextService as never,
  );
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

  it('rejects token-limited partial text by default', async () => {
    const response = new InferenceResponse(
      [new TextMessageContent('partial title')],
      {},
      'length',
    );

    await expect(
      useCaseWithResponse(response).execute(makeCommand()),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });

  it('returns token-limited partial text when the caller accepts it', async () => {
    const response = new InferenceResponse(
      [new TextMessageContent('partial answer')],
      {},
      'length',
    );

    await expect(
      useCaseWithResponse(response).execute(makeCommand(true)),
    ).resolves.toBe(response);
  });

  it('returns a text-only token-limit completion without visible text when the caller accepts it', async () => {
    const response = new InferenceResponse([], {}, 'length');

    await expect(
      useCaseWithResponse(response).execute(makeCommand(true)),
    ).resolves.toBe(response);
  });

  it('rejects token-limited tool calls even when token-limit completion is accepted', async () => {
    const response = new InferenceResponse(
      [
        new ToolUseMessageContent('call-1', 'get_weather', {
          city: 'Ber',
        }),
      ],
      {},
      'length',
    );

    await expect(
      useCaseWithResponse(response).execute(makeCommand(true)),
    ).rejects.toBeInstanceOf(InferenceTokenLimitError);
  });
});

describe('GetInferenceUseCase replayed message sanitation', () => {
  it('strips schema-disallowed nulls from replayed tool calls before dispatch', async () => {
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
    let received: InferenceInput | undefined;
    const registry = {
      getHandler: () => ({
        answer: (input: InferenceInput) => {
          received = input;
          return Promise.resolve({ content: [] });
        },
      }),
    };
    const contextService = { get: () => randomUUID() };
    const useCase = new GetInferenceUseCase(
      createPinoLoggerMock(),
      registry as never,
      contextService as never,
    );

    await useCase.execute(
      new GetInferenceCommand({
        model: { name: 'claude-sonnet-4' } as unknown as LanguageModel,
        messages: [history],
        tools: [tool],
        toolChoice: ModelToolChoice.AUTO,
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
