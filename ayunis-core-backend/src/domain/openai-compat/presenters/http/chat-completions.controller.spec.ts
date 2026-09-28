import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { Subject } from 'rxjs';
import type { ContextService } from 'src/common/context/services/context.service';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import type { ExecuteOpenAIChatCompletionUseCase } from 'src/domain/openai-compat/application/use-cases/execute-openai-chat-completion/execute-openai-chat-completion.use-case';
import type { ChatCompletionChunk } from 'src/domain/openai-compat/application/types/openai-chunk.types';
import type { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import type { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { ChatCompletionsController } from './chat-completions.controller';
import type { ChatCompletionRequestDto } from './dto/chat-completion-request.dto';

function fakeResponse(): Response & { written: string[] } {
  const written: string[] = [];
  const response = {
    headersSent: false,
    writableEnded: false,
    written,
    setHeader: jest.fn(),
    flushHeaders: jest.fn(() => {
      response.headersSent = true;
    }),
    write: jest.fn((data: string) => {
      response.headersSent = true;
      written.push(data);
      return true;
    }),
    end: jest.fn(() => {
      response.writableEnded = true;
    }),
  };
  return response as unknown as Response & { written: string[] };
}

describe('ChatCompletionsController streaming', () => {
  const orgId = randomUUID();
  const apiKeyId = randomUUID();
  const dto = {
    model: 'gpt-4o',
    stream: true,
    messages: [{ role: 'user', content: 'hello' }],
  } as unknown as ChatCompletionRequestDto;
  const request = {
    on: jest.fn(),
  } as unknown as RequestWithSubscriptionContext;
  let source: Subject<ChatCompletionChunk>;
  let controller: ChatCompletionsController;

  beforeEach(() => {
    source = new Subject<ChatCompletionChunk>();
    const useCase = {
      executeStreaming: jest.fn().mockResolvedValue(source.asObservable()),
    } as unknown as ExecuteOpenAIChatCompletionUseCase;
    const contextService = {
      get: jest.fn((key: string) => (key === 'orgId' ? orgId : apiKeyId)),
    } as unknown as ContextService;
    controller = new ChatCompletionsController(
      useCase,
      contextService,
      {} as IncrementTrialMessagesUseCase,
    );
  });

  it('leaves the response uncommitted when the provider fails before any output', async () => {
    const response = fakeResponse();
    const failure = new ProviderRequestRejectedError({
      provider: 'azure',
      upstreamStatus: 429,
      retryAfterMs: 1_000,
    });

    const result = controller.create(dto, request, response);
    await Promise.resolve();
    source.error(failure);

    await expect(result).rejects.toBe(failure);
    expect(response.headersSent).toBe(false);
    expect(response.flushHeaders).not.toHaveBeenCalled();
    expect(response.written).toEqual([]);
  });

  it('commits the event stream on the first chunk', async () => {
    const response = fakeResponse();
    const chunk = { id: 'chatcmpl-1' } as ChatCompletionChunk;

    const result = controller.create(dto, request, response);
    await Promise.resolve();
    source.next(chunk);
    source.complete();
    await result;

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
    expect(response.flushHeaders).toHaveBeenCalledTimes(1);
    expect(response.written).toEqual([
      `data: ${JSON.stringify(chunk)}\n\n`,
      'data: [DONE]\n\n',
    ]);
  });
});
