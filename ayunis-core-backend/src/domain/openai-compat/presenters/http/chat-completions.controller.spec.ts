import { setNamespace } from '@appsignal/nodejs';
import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { EMPTY } from 'rxjs';
import type { ContextService } from 'src/common/context/services/context.service';
import { AppsignalNamespaceMiddleware } from 'src/common/middleware/appsignal-namespace.middleware';
import type { ExecuteOpenAIChatCompletionUseCase } from 'src/domain/openai-compat/application/use-cases/execute-openai-chat-completion/execute-openai-chat-completion.use-case';
import type { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import type { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { ChatCompletionsController } from './chat-completions.controller';

jest.mock('@appsignal/nodejs', () => ({ setNamespace: jest.fn() }));

describe('ChatCompletionsController monitoring namespace', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([true, false])('keeps stream=%s requests in api', async (stream) => {
    const request = Object.assign(new EventEmitter(), {
      originalUrl: '/api/openai-compat/v1/chat/completions',
    });
    const response = {
      writableEnded: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const controller = new ChatCompletionsController(
      {
        executeStreaming: jest.fn().mockResolvedValue(EMPTY),
        executeNonStreaming: jest.fn().mockResolvedValue({ choices: [] }),
      } as unknown as ExecuteOpenAIChatCompletionUseCase,
      {
        get: (key: string) =>
          key === 'apiKeyId'
            ? '50cf7b62-280d-4c59-8711-326698c13ce8'
            : '838c7a34-c2f9-46be-b176-6500da96d41d',
      } as unknown as ContextService,
      {} as IncrementTrialMessagesUseCase,
    );

    new AppsignalNamespaceMiddleware().use(
      request as unknown as Request,
      response as unknown as Response,
      () => undefined,
    );
    await controller.create(
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        stream,
      },
      request as unknown as RequestWithSubscriptionContext,
      response as unknown as Response,
    );

    expect(jest.mocked(setNamespace).mock.calls).toEqual([['api']]);
  });
});
