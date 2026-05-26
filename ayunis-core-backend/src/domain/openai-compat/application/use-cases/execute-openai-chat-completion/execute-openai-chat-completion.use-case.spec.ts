import { randomUUID } from 'crypto';
import { Observable, Subject } from 'rxjs';
import { ExecuteOpenAIChatCompletionUseCase } from './execute-openai-chat-completion.use-case';
import { ExecuteOpenAIChatCompletionCommand } from './execute-openai-chat-completion.command';
import type { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import type { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import { OpenAIRequestMapper } from '../../mappers/openai-request.mapper';
import { OpenAIResponseMapper } from '../../mappers/openai-response.mapper';
import { OpenAIStreamMapper } from '../../mappers/openai-stream.mapper';
import { StreamInferenceResponseChunk } from 'src/domain/models/application/ports/stream-inference.handler';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { OpenAIModelNotFoundError } from '../../openai-compat.errors';
import type { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';

describe('ExecuteOpenAIChatCompletionUseCase', () => {
  let useCase: ExecuteOpenAIChatCompletionUseCase;
  let getPermittedLanguageModelsUseCase: jest.Mocked<GetPermittedLanguageModelsUseCase>;
  let getInferenceUseCase: jest.Mocked<GetInferenceUseCase>;
  let streamInferenceUseCase: jest.Mocked<StreamInferenceUseCase>;
  let inferenceUsageGuard: jest.Mocked<InferenceUsageGuard>;

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
      } as ConstructorParameters<typeof ExecuteOpenAIChatCompletionCommand>[0],
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
      collectUsage: jest.fn(),
    } as unknown as jest.Mocked<InferenceUsageGuard>;

    useCase = new ExecuteOpenAIChatCompletionUseCase(
      getPermittedLanguageModelsUseCase,
      getInferenceUseCase,
      streamInferenceUseCase,
      inferenceUsageGuard,
      new OpenAIRequestMapper(),
      new OpenAIResponseMapper(),
      new OpenAIStreamMapper(),
    );
  });

  describe('executeNonStreaming', () => {
    it('returns an OpenAI-shaped response and records usage', async () => {
      getInferenceUseCase.execute.mockResolvedValue(
        new InferenceResponse([new TextMessageContent('Hi there!')], {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
      );

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
      expect(inferenceUsageGuard.collectUsage).toHaveBeenCalledWith(
        model,
        { inputTokens: 10, outputTokens: 5 },
        expect.any(String),
      );
    });

    it('throws OpenAIModelNotFoundError without calling guard for an unknown model', async () => {
      getPermittedLanguageModelsUseCase.execute.mockResolvedValue([]);

      await expect(useCase.executeNonStreaming(baseCommand())).rejects.toThrow(
        OpenAIModelNotFoundError,
      );
      expect(inferenceUsageGuard.preflight).not.toHaveBeenCalled();
      expect(inferenceUsageGuard.collectUsage).not.toHaveBeenCalled();
    });

    it('propagates preflight failure and does not call collectUsage', async () => {
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
      expect(inferenceUsageGuard.collectUsage).not.toHaveBeenCalled();
    });
  });

  describe('executeStreaming', () => {
    function chunkWithUsage(
      input: number,
      output: number,
    ): StreamInferenceResponseChunk {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [],
        usage: { inputTokens: input, outputTokens: output },
      });
    }

    it('sums usage across chunks via finalize', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      const result$ = await useCase.executeStreaming(
        baseCommand({ stream: true }),
      );
      const collected: unknown[] = [];
      const sub = result$.subscribe({
        next: (c) => collected.push(c),
      });

      subject.next(StreamInferenceResponseChunk.text('Hello'));
      subject.next(chunkWithUsage(10, 0));
      subject.next(StreamInferenceResponseChunk.text(' world'));
      subject.next(chunkWithUsage(5, 8));
      subject.complete();
      sub.unsubscribe();

      expect(collected.length).toBeGreaterThan(0);
      expect(inferenceUsageGuard.collectUsage).toHaveBeenCalledTimes(1);
      expect(inferenceUsageGuard.collectUsage).toHaveBeenCalledWith(
        model,
        { inputTokens: 15, outputTokens: 8 },
        expect.any(String),
      );
    });

    it('records partial usage when the client disconnects mid-stream (unsubscribe)', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      const result$ = await useCase.executeStreaming(
        baseCommand({ stream: true }),
      );
      const sub = result$.subscribe();

      subject.next(chunkWithUsage(7, 3));
      // Simulate client disconnect — finalize must fire.
      sub.unsubscribe();

      expect(inferenceUsageGuard.collectUsage).toHaveBeenCalledTimes(1);
      expect(inferenceUsageGuard.collectUsage).toHaveBeenCalledWith(
        model,
        { inputTokens: 7, outputTokens: 3 },
        expect.any(String),
      );
    });

    it('does not record usage when the stream produced no token counts', async () => {
      const subject = new Subject<StreamInferenceResponseChunk>();
      streamInferenceUseCase.execute.mockReturnValue(subject.asObservable());

      const result$ = await useCase.executeStreaming(
        baseCommand({ stream: true }),
      );
      const sub = result$.subscribe();
      subject.next(StreamInferenceResponseChunk.text('partial'));
      subject.complete();
      sub.unsubscribe();

      expect(inferenceUsageGuard.collectUsage).not.toHaveBeenCalled();
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
        } as ConstructorParameters<
          typeof ExecuteOpenAIChatCompletionCommand
        >[0],
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

      // Downstream converters interpret a non-enum string as a named tool —
      // see openai-chat-message.converter.ts:54-56.
      expect(capturedToolChoice).toBe('get_weather');
    });
  });
});
