import { randomUUID } from 'crypto';
import { Observable, Subject } from 'rxjs';
import { ExecuteOpenAIChatCompletionUseCase } from './execute-openai-chat-completion.use-case';
import { ExecuteOpenAIChatCompletionCommand } from './execute-openai-chat-completion.command';
import type { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import type { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import { OpenAIRequestMapper } from 'src/domain/openai-compat/application/mappers/openai-request.mapper';
import { OpenAIResponseMapper } from 'src/domain/openai-compat/application/mappers/openai-response.mapper';
import { OpenAIStreamMapper } from 'src/domain/openai-compat/application/mappers/openai-stream.mapper';
import { StreamInferenceResponseChunk } from 'src/domain/models/application/models/stream-inference-response-chunk';
import { InferenceResponse } from 'src/domain/models/application/models/inference-response';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { OpenAIModelNotFoundError } from 'src/domain/openai-compat/application/openai-compat.errors';
import type { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import {
  InferenceFailedError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';
import type { OpenAIFileContentService } from 'src/domain/openai-compat/application/services/openai-file-content.service';
import { ProviderErrorReason } from 'src/common/errors/extract-provider-error-diagnostics.helper';

describe('ExecuteOpenAIChatCompletionUseCase', () => {
  let useCase: ExecuteOpenAIChatCompletionUseCase;
  let getPermittedLanguageModelsUseCase: jest.Mocked<GetPermittedLanguageModelsUseCase>;
  let getInferenceUseCase: jest.Mocked<GetInferenceUseCase>;
  let streamInferenceUseCase: jest.Mocked<StreamInferenceUseCase>;
  let inferenceUsageGuard: jest.Mocked<InferenceUsageGuard>;
  let fileContentService: jest.Mocked<OpenAIFileContentService>;

  const orgId = randomUUID();
  const apiKeyId = randomUUID();

  const model = new LanguageModel({
    name: 'gpt-4o',
    provider: ModelProvider.OPENAI,
    displayName: 'GPT-4o',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: false,
    isArchived: false,
    tier: ModelTier.MEDIUM,
    inputTokenCost: 2,
    outputTokenCost: 8,
  });

  const permitted = new PermittedLanguageModel({
    model,
    orgId,
  });

  const principal = { apiKeyId, orgId };

  const baseCommand = (
    overrides?: Partial<
      ConstructorParameters<typeof ExecuteOpenAIChatCompletionCommand>[0]
    >,
  ): ExecuteOpenAIChatCompletionCommand =>
    new ExecuteOpenAIChatCompletionCommand(
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
        ...overrides,
      },
      principal,
    );

  beforeEach(() => {
    getPermittedLanguageModelsUseCase = {
      execute: jest.fn().mockResolvedValue([permitted]),
    } as unknown as jest.Mocked<GetPermittedLanguageModelsUseCase>;

    getInferenceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetInferenceUseCase>;

    streamInferenceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StreamInferenceUseCase>;

    inferenceUsageGuard = {
      preflight: jest.fn().mockResolvedValue(undefined),
      ensureModelCallAllowed: jest.fn().mockResolvedValue(undefined),
      collectUsage: jest.fn(),
      collectUsageCritical: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<InferenceUsageGuard>;

    fileContentService = {
      expand: jest.fn().mockImplementation(async (request) => request),
    } as unknown as jest.Mocked<OpenAIFileContentService>;

    useCase = new ExecuteOpenAIChatCompletionUseCase(
      getPermittedLanguageModelsUseCase,
      getInferenceUseCase,
      streamInferenceUseCase,
      inferenceUsageGuard,
      fileContentService,
      new OpenAIRequestMapper(),
      new OpenAIResponseMapper(),
      new OpenAIStreamMapper(),
    );
  });

  describe('executeNonStreaming', () => {
    it('returns an OpenAI-shaped response and critically records usage', async () => {
      getInferenceUseCase.execute.mockImplementation(async (command) => {
        await command.onCallTerminal?.({
          outcome: 'completed',
          usage: { inputTokens: 10, outputTokens: 5 },
        });
        return new InferenceResponse([new TextMessageContent('Hi there!')], {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        });
      });

      const result = await useCase.executeNonStreaming(baseCommand());

      expect(result.object).toBe('chat.completion');
      expect(result.model).toBe('gpt-4o');
      expect(result.choices[0].message.content).toBe('Hi there!');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });
      expect(inferenceUsageGuard.preflight).toHaveBeenCalledTimes(1);
      expect(inferenceUsageGuard.ensureModelCallAllowed).toHaveBeenCalledTimes(
        1,
      );
      expect(inferenceUsageGuard.ensureModelCallAllowed).toHaveBeenCalledWith(
        principal,
        model,
      );
      expect(inferenceUsageGuard.collectUsageCritical).toHaveBeenCalledTimes(1);
      expect(inferenceUsageGuard.collectUsageCritical).toHaveBeenCalledWith(
        model,
        { inputTokens: 10, outputTokens: 5 },
        expect.any(String),
      );
      expect(inferenceUsageGuard.collectUsage).not.toHaveBeenCalled();
    });

    it('fails a paid non-streaming call that reports no usage', async () => {
      getInferenceUseCase.execute.mockImplementation(async (command) => {
        await command.onCallTerminal?.({ outcome: 'completed' });
        return new InferenceResponse([new TextMessageContent('answer')], {});
      });

      await expect(
        useCase.executeNonStreaming(baseCommand()),
      ).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_USAGE_ACCOUNTING_FAILED',
      });
      expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
    });

    it('reports a failed critical usage write as an accounting failure', async () => {
      inferenceUsageGuard.collectUsageCritical.mockRejectedValue(
        new Error('connection terminated'),
      );
      getInferenceUseCase.execute.mockImplementation(async (command) => {
        await command.onCallTerminal?.({
          outcome: 'completed',
          usage: { inputTokens: 3, outputTokens: 1 },
        });
        return new InferenceResponse([new TextMessageContent('answer')], {});
      });

      await expect(
        useCase.executeNonStreaming(baseCommand()),
      ).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_USAGE_ACCOUNTING_FAILED',
      });
    });

    it('gates immediately before the direct inference call', async () => {
      const order: string[] = [];
      inferenceUsageGuard.preflight.mockImplementation(async () => {
        order.push('preflight');
      });
      inferenceUsageGuard.ensureModelCallAllowed.mockImplementation(
        async () => {
          order.push('gate');
        },
      );
      getInferenceUseCase.execute.mockImplementation(async () => {
        order.push('inference');
        return new InferenceResponse([new TextMessageContent('answer')], {});
      });

      await useCase.executeNonStreaming(baseCommand());

      expect(order).toEqual(['preflight', 'gate', 'inference']);
    });

    it('does not call inference when the call-boundary gate rejects', async () => {
      const rejected = new QuotaExceededError(
        QuotaType.FAIR_USE_MESSAGES_MEDIUM,
        100,
        3600_000,
        60,
      );
      inferenceUsageGuard.ensureModelCallAllowed.mockRejectedValue(rejected);

      await expect(useCase.executeNonStreaming(baseCommand())).rejects.toBe(
        rejected,
      );
      expect(getInferenceUseCase.execute).not.toHaveBeenCalled();
      expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
    });

    it('passes extracted inline file text to inference', async () => {
      fileContentService.expand.mockResolvedValueOnce({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '[Document: budget.pdf]\nCouncil budget\n[End document]',
              },
              { type: 'text', text: 'Summarize it.' },
            ],
          },
        ],
      });
      getInferenceUseCase.execute.mockResolvedValue(
        new InferenceResponse([new TextMessageContent('Summary')], {}),
      );
      const command = baseCommand({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                file: {
                  filename: 'budget.pdf',
                  file_data: Buffer.from('%PDF budget').toString('base64'),
                },
              },
              { type: 'text', text: 'Summarize it.' },
            ],
          },
        ],
      });

      await useCase.executeNonStreaming(command);

      const inferenceCommand = getInferenceUseCase.execute.mock.calls[0][0];
      expect(
        (inferenceCommand.messages[0].content[0] as TextMessageContent).text,
      ).toContain('Council budget');
    });

    it('returns token-limited partial text as a length completion', async () => {
      const response = new InferenceResponse(
        [new TextMessageContent('Partial answer')],
        {},
        'length',
      );
      getInferenceUseCase.execute.mockResolvedValue(response);

      const result = await useCase.executeNonStreaming(baseCommand());

      expect(result.choices[0]).toMatchObject({
        message: { content: 'Partial answer' },
        finish_reason: 'length',
      });
      expect(getInferenceUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ acceptTokenLimitCompletion: true }),
      );
    });

    it('classifies a token-limited tool call as an expected client response', async () => {
      getInferenceUseCase.execute.mockRejectedValue(
        new InferenceTokenLimitError({ toolNames: ['get_weather'] }),
      );

      await expect(
        useCase.executeNonStreaming(baseCommand()),
      ).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_TOKEN_LIMIT',
        statusCode: 422,
      });
      expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
    });

    it('classifies a provider context-length rejection as an invalid OpenAI request', async () => {
      getInferenceUseCase.execute.mockRejectedValue(
        new InferenceFailedError('Provider inference failed', {
          upstreamStatus: 400,
          upstreamReason: ProviderErrorReason.CONTEXT_LENGTH_EXCEEDED,
        }),
      );

      await expect(
        useCase.executeNonStreaming(baseCommand()),
      ).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_INVALID_REQUEST',
        statusCode: 400,
        message: "Request exceeds the model's context length",
      });
    });

    it('keeps unclassified provider rejections as inference failures', async () => {
      const upstream = new InferenceFailedError('Provider inference failed', {
        upstreamStatus: 400,
        upstreamReason: ProviderErrorReason.UNKNOWN_REQUEST_REJECTION,
      });
      getInferenceUseCase.execute.mockRejectedValue(upstream);

      await expect(useCase.executeNonStreaming(baseCommand())).rejects.toBe(
        upstream,
      );
    });

    it('throws OpenAIModelNotFoundError without calling guard for an unknown model', async () => {
      getPermittedLanguageModelsUseCase.execute.mockResolvedValue([]);

      await expect(useCase.executeNonStreaming(baseCommand())).rejects.toThrow(
        OpenAIModelNotFoundError,
      );
      expect(inferenceUsageGuard.preflight).not.toHaveBeenCalled();
      expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
    });

    it('propagates preflight failure and does not record usage', async () => {
      inferenceUsageGuard.preflight.mockRejectedValue(
        new QuotaExceededError(
          QuotaType.FAIR_USE_MESSAGES_MEDIUM,
          100,
          3600_000,
          60,
        ),
      );

      await expect(useCase.executeNonStreaming(baseCommand())).rejects.toThrow(
        QuotaExceededError,
      );
      expect(getInferenceUseCase.execute).not.toHaveBeenCalled();
      expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
    });
  });

  describe('executeStreaming', () => {
    it('passes extracted inline file text to streaming inference', async () => {
      fileContentService.expand.mockResolvedValueOnce({
        model: 'gpt-4o',
        stream: true,
        messages: [
          {
            role: 'user',
            content: '[Document: plan.pdf]\nMobility plan\n[End document]',
          },
        ],
      });
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      await useCase.executeStreaming(baseCommand({ stream: true }));

      const inferenceInput = streamInferenceUseCase.execute.mock.calls[0][0];
      expect(
        (inferenceInput.messages[0].content[0] as TextMessageContent).text,
      ).toContain('Mobility plan');
      subject.complete();
    });

    it('classifies a provider tool-schema rejection as an invalid OpenAI request', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      const result$ = await useCase.executeStreaming(
        baseCommand({ stream: true }),
      );
      const result = new Promise<never>((_resolve, reject) => {
        result$.subscribe({ error: reject });
      });
      subject.error(
        new InferenceFailedError('Provider inference failed', {
          upstreamStatus: 400,
          upstreamReason: ProviderErrorReason.INVALID_TOOL_SCHEMA,
          upstreamParam: 'tools[14].function.parameters',
        }),
      );

      await expect(result).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_INVALID_REQUEST',
        statusCode: 400,
        message: "Invalid tool schema at 'tools[14].function.parameters'",
      });
    });

    it('opens the stream on an invisible first provider chunk so later failures stay in-band', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());
      const result$ = await useCase.executeStreaming(
        baseCommand({ stream: true }),
      );
      const visible: unknown[] = [];
      result$.subscribe((chunk) => visible.push(chunk));

      subject.next(
        new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [],
          usage: { inputTokens: 4, outputTokens: 1 },
        }),
      );
      subject.next(StreamInferenceResponseChunk.text('recovered'));

      expect(visible).toEqual([
        expect.objectContaining({
          choices: [expect.objectContaining({ delta: { role: 'assistant' } })],
        }),
        expect.objectContaining({
          choices: [
            expect.objectContaining({ delta: { content: 'recovered' } }),
          ],
        }),
      ]);
      subject.complete();
    });

    it('gates once before dispatching the single provider call', async () => {
      const order: string[] = [];
      inferenceUsageGuard.ensureModelCallAllowed.mockImplementation(
        async () => {
          order.push('gate');
        },
      );
      streamInferenceUseCase.execute.mockImplementation(() => {
        order.push('dispatch');
        return new Subject<StreamInferenceResponseChunk>().asObservable();
      });

      await useCase.executeStreaming(baseCommand({ stream: true }));

      expect(order).toEqual(['gate', 'dispatch']);
      expect(inferenceUsageGuard.ensureModelCallAllowed).toHaveBeenCalledWith(
        principal,
        model,
      );
    });

    it('rejects the initial streaming gate before dispatching the SSE source', async () => {
      const rejected = new QuotaExceededError(
        QuotaType.FAIR_USE_MESSAGES_MEDIUM,
        100,
        3600_000,
        60,
      );
      inferenceUsageGuard.ensureModelCallAllowed.mockRejectedValue(rejected);

      await expect(
        useCase.executeStreaming(baseCommand({ stream: true })),
      ).rejects.toMatchObject({ statusCode: 429 });
      expect(streamInferenceUseCase.execute).not.toHaveBeenCalled();
    });

    it.each(['completed', 'failed', 'aborted'] as const)(
      'critically records usage for a %s call',
      async (outcome) => {
        const subject = new Subject<StreamInferenceResponseChunk>();
        streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

        await useCase.executeStreaming(baseCommand({ stream: true }));
        const onCallTerminal =
          streamInferenceUseCase.execute.mock.calls[0][0].onCallTerminal;
        await onCallTerminal?.({
          outcome,
          usage: { inputTokens: 15, outputTokens: 8 },
        });

        expect(inferenceUsageGuard.collectUsageCritical).toHaveBeenCalledWith(
          model,
          { inputTokens: 15, outputTokens: 8 },
          expect.stringMatching(/^[0-9a-f-]{36}$/),
        );
        subject.complete();
      },
    );

    it('awaits critical usage persistence before resolving the terminal callback', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());
      let release!: () => void;
      const persistence = new Promise<void>((resolve) => (release = resolve));
      inferenceUsageGuard.collectUsageCritical.mockReturnValue(persistence);

      await useCase.executeStreaming(baseCommand({ stream: true }));
      const onCallTerminal =
        streamInferenceUseCase.execute.mock.calls[0][0].onCallTerminal;
      let settled = false;
      const terminal = Promise.resolve(
        onCallTerminal?.({
          outcome: 'completed',
          usage: { inputTokens: 9, outputTokens: 4 },
        }),
      ).then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);

      release();
      await terminal;
      expect(settled).toBe(true);
      subject.complete();
    });

    it.each(['completed', 'failed', 'aborted'] as const)(
      'fails a consumed paid %s call without usage',
      async (outcome) => {
        const subject = new Subject<StreamInferenceResponseChunk>();
        streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

        await useCase.executeStreaming(baseCommand({ stream: true }));
        const onCallTerminal =
          streamInferenceUseCase.execute.mock.calls[0][0].onCallTerminal;

        await expect(onCallTerminal?.({ outcome })).rejects.toMatchObject({
          code: 'OPENAI_COMPAT_USAGE_ACCOUNTING_FAILED',
        });
        expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
        subject.complete();
      },
    );

    it('allows a free model to complete without provider usage', async () => {
      const freeModel = new LanguageModel({
        name: 'open-source-free',
        provider: ModelProvider.OLLAMA,
        displayName: 'Open Source Free',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: false,
        isArchived: false,
        tier: ModelTier.LOW,
      });
      getPermittedLanguageModelsUseCase.execute.mockResolvedValue([
        new PermittedLanguageModel({ model: freeModel, orgId }),
      ]);
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      await useCase.executeStreaming(
        baseCommand({ model: freeModel.name, stream: true }),
      );
      const onCallTerminal =
        streamInferenceUseCase.execute.mock.calls[0][0].onCallTerminal;

      await expect(
        onCallTerminal?.({ outcome: 'completed' }),
      ).resolves.toBeUndefined();
      expect(inferenceUsageGuard.collectUsageCritical).not.toHaveBeenCalled();
      subject.complete();
    });

    it('forwards the orgId from principal into StreamInferenceInput', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      await useCase.executeStreaming(baseCommand({ stream: true }));
      const arg = streamInferenceUseCase.execute.mock.calls[0][0];
      expect(arg.orgId).toBe(orgId);
      subject.complete();
    });

    it('returns an Observable that can be subscribed to repeatedly', async () => {
      streamInferenceUseCase.execute.mockReturnValue(
        new Observable((sub) => sub.complete()),
      );

      const result$ = await useCase.executeStreaming(
        baseCommand({ stream: true }),
      );
      expect(result$).toBeInstanceOf(Observable);
    });
  });

  describe('tool-call request mapping (regression for AYC-78 finding I6)', () => {
    it('rebuilds the tool-call-id → name map per assistant turn', async () => {
      // Two assistant turns reuse the same id 'call_1' for different tools.
      // The tool result after the SECOND turn must resolve to 'shipment_lookup',
      // not the first turn's 'weather'.
      let capturedMessagesAtFirstInference: unknown;
      getInferenceUseCase.execute.mockImplementation(async (cmd) => {
        capturedMessagesAtFirstInference = cmd.messages;
        return new InferenceResponse([new TextMessageContent('done')], {});
      });

      const cmd = new ExecuteOpenAIChatCompletionCommand(
        {
          model: 'gpt-4o',
          messages: [
            { role: 'user', content: 'what is the weather?' },
            {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'weather', arguments: '{}' },
                },
              ],
            },
            { role: 'tool', tool_call_id: 'call_1', content: 'sunny' },
            { role: 'user', content: 'and my package?' },
            {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'shipment_lookup', arguments: '{}' },
                },
              ],
            },
            { role: 'tool', tool_call_id: 'call_1', content: 'delivered' },
          ],
        },
        principal,
      );

      await useCase.executeNonStreaming(cmd);

      const passed = capturedMessagesAtFirstInference as Array<{
        content: Array<{ toolName?: string; result?: string }>;
      }>;
      // Two ToolResultMessage entities — the second one must reference
      // 'shipment_lookup' (the most recent turn's tool name).
      const toolResultMessages = passed.filter((m) =>
        m.content.some((c) => c.toolName !== undefined),
      );
      expect(toolResultMessages).toHaveLength(2);
      expect(toolResultMessages[0].content[0].toolName).toBe('weather');
      expect(toolResultMessages[1].content[0].toolName).toBe('shipment_lookup');
    });
  });

  describe('tool_choice mapping', () => {
    it('forwards a named function tool_choice as the function name string', async () => {
      let capturedToolChoice: unknown;
      getInferenceUseCase.execute.mockImplementation(async (cmd) => {
        capturedToolChoice = cmd.toolChoice;
        return new InferenceResponse([new TextMessageContent('ok')], {});
      });

      await useCase.executeNonStreaming(
        baseCommand({
          tool_choice: {
            type: 'function',
            function: { name: 'get_weather' },
          },
        }),
      );

      // Downstream the runtime request mapper interprets a non-enum string as
      // a named tool — see infrastructure/runtime/request.mapper.ts
      // `toInferenceToolChoice`.
      expect(capturedToolChoice).toBe('get_weather');
    });
  });
});
