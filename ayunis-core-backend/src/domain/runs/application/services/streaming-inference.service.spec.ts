import { from, Observable, throwError } from 'rxjs';
import type { UUID } from 'crypto';
import { StreamingInferenceService } from './streaming-inference.service';
import { extractUsageFromChunks } from '../helpers/stream-usage.helper';
import {
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from 'src/domain/models/application/ports/stream-inference.handler';
import {
  InferenceFailedError,
  InferenceStreamStalledError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import type { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import type { InferenceUsageGuard } from './inference-usage-guard.service';
import type { ContextService } from 'src/common/context/services/context.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';

describe('extractUsageFromChunks', () => {
  const chunkWithUsage = (usage: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadInputTokens?: number;
    cacheWriteInputTokens?: number;
  }): StreamInferenceResponseChunk =>
    new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      usage,
    });

  it('returns undefined when no chunk carries usage', () => {
    expect(
      extractUsageFromChunks([
        StreamInferenceResponseChunk.text('a'),
        StreamInferenceResponseChunk.text('b'),
      ]),
    ).toBeUndefined();
  });

  it('takes last-wins instead of summing cumulative per-chunk usage', () => {
    // Providers (e.g. Gemini, Mistral) report cumulative usage on every chunk.
    // Summing would over-count; the final values are the truth.
    const usage = extractUsageFromChunks([
      chunkWithUsage({ inputTokens: 100, outputTokens: 10 }),
      chunkWithUsage({ inputTokens: 100, outputTokens: 25 }),
      chunkWithUsage({ inputTokens: 100, outputTokens: 42 }),
    ]);
    expect(usage).toEqual({ inputTokens: 100, outputTokens: 42 });
  });

  it('carries forward the last defined value of each field independently', () => {
    // Gemini repeats promptTokenCount on every chunk but only emits
    // candidatesTokenCount on the final chunk.
    const usage = extractUsageFromChunks([
      chunkWithUsage({ inputTokens: 100 }),
      chunkWithUsage({ inputTokens: 100 }),
      chunkWithUsage({ inputTokens: 100, outputTokens: 30 }),
    ]);
    expect(usage).toEqual({ inputTokens: 100, outputTokens: 30 });
  });

  it('bills cached prompt tokens as input tokens', () => {
    // Anthropic's input_tokens excludes tokens served by or written to the
    // prompt cache. Option A billing: customers pay for the full prompt as
    // if uncached, so cache read/write tokens count as input.
    const usage = extractUsageFromChunks([
      chunkWithUsage({
        inputTokens: 3,
        cacheWriteInputTokens: 9677,
        cacheReadInputTokens: 0,
      }),
      chunkWithUsage({ outputTokens: 42 }),
    ]);
    expect(usage).toEqual({ inputTokens: 9680, outputTokens: 42 });
  });

  it('bills cache reads and writes together with uncached input', () => {
    const usage = extractUsageFromChunks([
      chunkWithUsage({
        inputTokens: 10,
        cacheWriteInputTokens: 200,
        cacheReadInputTokens: 3000,
        outputTokens: 5,
      }),
    ]);
    expect(usage).toEqual({ inputTokens: 3210, outputTokens: 5 });
  });
});

describe('StreamingInferenceService.executeStreamingInference — tool-call integrity (AYC-646)', () => {
  const threadId = '0d6b1a1e-6c2f-4c1e-9e6a-2f4b8c9d0e1f' as UUID;
  const orgId = '9f8e7d6c-5b4a-3f2e-1d0c-b9a8f7e6d5c4' as UUID;

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
    inputTokenCost: 1,
    outputTokenCost: 2,
  });

  const toolCallChunk = (params: {
    id?: string | null;
    name?: string | null;
    argumentsDelta?: string | null;
    finishReason?: string | null;
  }): StreamInferenceResponseChunk =>
    new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [
        new StreamInferenceResponseChunkToolCall({
          index: 0,
          id: params.id ?? null,
          name: params.name ?? null,
          argumentsDelta: params.argumentsDelta ?? null,
        }),
      ],
      finishReason: params.finishReason,
    });

  const finishChunk = (finishReason: string): StreamInferenceResponseChunk =>
    new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      finishReason,
    });

  const buildService = (chunks: StreamInferenceResponseChunk[]) =>
    buildServiceWithStream(jest.fn().mockReturnValue(from(chunks)));

  const buildServiceWithStream = (execute: jest.Mock) => {
    const streamInferenceUseCase = {
      execute,
    } as unknown as StreamInferenceUseCase;
    const savedMessages: AssistantMessage[] = [];
    const saveAssistantMessageUseCase = {
      execute: jest
        .fn()
        .mockImplementation((command: { message: AssistantMessage }) => {
          savedMessages.push(command.message);
          return Promise.resolve(command.message);
        }),
    } as unknown as SaveAssistantMessageUseCase;
    const inferenceUsageGuard = {
      collectUsage: jest.fn(),
    } as unknown as InferenceUsageGuard;
    const contextService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ContextService;
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as EventEmitter2;
    const service = new StreamingInferenceService(
      streamInferenceUseCase,
      saveAssistantMessageUseCase,
      inferenceUsageGuard,
      contextService,
      eventEmitter,
    );
    return { service, savedMessages };
  };

  const consume = async (service: StreamingInferenceService) => {
    const yielded: { id: UUID }[] = [];
    for await (const message of service.executeStreamingInference({
      model,
      messages: [],
      tools: [],
      threadId,
      orgId,
    })) {
      // The generator yields the same mutable entity; snapshot the id so
      // retry tests can assert identity across attempts.
      yielded.push({ id: message.id });
    }
    return yielded;
  };

  it('persists a tool call whose streamed arguments form valid JSON', async () => {
    const { service, savedMessages } = buildService([
      toolCallChunk({
        id: 'call_1',
        name: 'create_document',
        argumentsDelta: '{"title":"Parkraumkonzept",',
      }),
      toolCallChunk({ argumentsDelta: '"content":"<h1>Bericht</h1>"}' }),
      finishChunk('tool_calls'),
    ]);

    await consume(service);

    const toolUses = savedMessages[0].content.filter(
      (block): block is ToolUseMessageContent =>
        block instanceof ToolUseMessageContent,
    );
    expect(toolUses).toHaveLength(1);
    expect(toolUses[0].params).toEqual({
      title: 'Parkraumkonzept',
      content: '<h1>Bericht</h1>',
    });
  });

  it('throws InferenceFailedError instead of executing a tool call whose final arguments are unparseable', async () => {
    const { service, savedMessages } = buildService([
      toolCallChunk({
        id: 'call_1',
        name: 'create_document',
        argumentsDelta:
          '{"title":"Bürgerbrief Parkraumkonzept","content":"<h1>Parkraumkonzept</h1><p>Sehr geehrte Damen',
      }),
      finishChunk('stop'),
    ]);

    await expect(consume(service)).rejects.toThrow(InferenceFailedError);

    // The broken call must not be persisted with guessed `{}` arguments —
    // that is what triggered the endless create_document loop (AYC-646).
    const toolUses = (savedMessages[0]?.content ?? []).filter(
      (block) => block instanceof ToolUseMessageContent,
    );
    expect(toolUses).toHaveLength(0);
  });

  it('throws InferenceTokenLimitError when the stream hits the token limit while emitting tool calls', async () => {
    const { service, savedMessages } = buildService([
      toolCallChunk({
        id: 'call_1',
        name: 'create_document',
        argumentsDelta: '{"title":"Bericht","content":"<h1>Kurz</h1>"}',
      }),
      finishChunk('length'),
    ]);

    await expect(consume(service)).rejects.toThrow(InferenceTokenLimitError);

    // Even parseable arguments from a token-limited turn must not be
    // persisted — the collector would execute them on the next run.
    const toolUses = (savedMessages[0]?.content ?? []).filter(
      (block) => block instanceof ToolUseMessageContent,
    );
    expect(toolUses).toHaveLength(0);
  });

  it('retries once when the token limit truncates a tool call before any text or thinking streamed (AYC-669)', async () => {
    // A failed tool-only attempt persists nothing (tool calls are excluded
    // from the saved message), so a second attempt cannot duplicate content.
    const truncatedChunks = [
      toolCallChunk({
        id: 'call_1',
        name: 'create_document',
        argumentsDelta: '{"title":"Bericht","content":"<h1>Unvollst',
      }),
      finishChunk('length'),
    ];
    const healthyChunks = [
      toolCallChunk({
        id: 'call_1',
        name: 'create_document',
        argumentsDelta: '{"title":"Bericht","content":"<h1>Kurz</h1>"}',
      }),
      finishChunk('tool_calls'),
    ];
    const execute = jest
      .fn()
      .mockReturnValueOnce(from(truncatedChunks))
      .mockReturnValueOnce(from(healthyChunks));
    const { service, savedMessages } = buildServiceWithStream(execute);

    const yielded = await consume(service);

    expect(execute).toHaveBeenCalledTimes(2);
    const toolUses = savedMessages
      .flatMap((message) => message.content)
      .filter((block) => block instanceof ToolUseMessageContent);
    expect(toolUses).toHaveLength(1);
    // Both attempts must stream under one message id — the chat UI keys
    // updates by id, so a fresh id would leave the failed attempt's partial
    // tool call on screen as a phantom message beside the retry.
    expect(new Set(yielded.map((message) => message.id)).size).toBe(1);
  });

  it('retries a token-limit truncation when only whitespace streamed before the tool call', async () => {
    // Persistence trims text before saving (buildBaseContent), so a
    // whitespace-only prefix leaves nothing behind — it must not block the
    // retry the way real text does.
    const execute = jest
      .fn()
      .mockReturnValueOnce(
        from([
          StreamInferenceResponseChunk.text('\n\n'),
          toolCallChunk({
            id: 'call_1',
            name: 'create_document',
            argumentsDelta: '{"title":"Bericht","content":"<h1>Unvollst',
          }),
          finishChunk('length'),
        ]),
      )
      .mockReturnValueOnce(
        from([
          toolCallChunk({
            id: 'call_1',
            name: 'create_document',
            argumentsDelta: '{"title":"Bericht","content":"<h1>Kurz</h1>"}',
          }),
          finishChunk('tool_calls'),
        ]),
      );
    const { service, savedMessages } = buildServiceWithStream(execute);

    await consume(service);

    expect(execute).toHaveBeenCalledTimes(2);
    const toolUses = savedMessages
      .flatMap((message) => message.content)
      .filter((block) => block instanceof ToolUseMessageContent);
    expect(toolUses).toHaveLength(1);
  });

  it('does not retry a token-limit truncation after text was streamed', async () => {
    // The streamed text is saved by the failed attempt; a retry would append
    // a second answer to the thread.
    const execute = jest.fn().mockReturnValue(
      from([
        StreamInferenceResponseChunk.text('Der Bericht beginnt hier'),
        toolCallChunk({
          id: 'call_1',
          name: 'create_document',
          argumentsDelta: '{"title":"Bericht","content":"<h1>Unvollst',
        }),
        finishChunk('length'),
      ]),
    );
    const { service } = buildServiceWithStream(execute);

    await expect(consume(service)).rejects.toThrow(InferenceTokenLimitError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('discards intact sibling tool calls when one call of the turn is corrupted', async () => {
    const { service, savedMessages } = buildService([
      new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: 0,
            id: 'call_1',
            name: 'list_letterheads',
            argumentsDelta: '{}',
          }),
          new StreamInferenceResponseChunkToolCall({
            index: 1,
            id: 'call_2',
            name: 'create_document',
            argumentsDelta: '{"title":"Bericht","content":"<h1>Unvollst',
          }),
        ],
      }),
      finishChunk('stop'),
    ]);

    await expect(consume(service)).rejects.toThrow(InferenceFailedError);

    // Persisting the intact sibling would re-execute half the turn on the
    // next run while the model never saw any results for it.
    const toolUses = (savedMessages[0]?.content ?? []).filter(
      (block) => block instanceof ToolUseMessageContent,
    );
    expect(toolUses).toHaveLength(0);
  });

  it('keeps a truncated text-only answer instead of failing the run', async () => {
    const { service, savedMessages } = buildService([
      StreamInferenceResponseChunk.text('Der Bericht beginnt hier und'),
      finishChunk('length'),
    ]);

    await consume(service);

    expect(savedMessages).toHaveLength(1);
    const [text] = savedMessages[0].content;
    expect(text).toBeInstanceOf(TextMessageContent);
  });

  it('retries once when the stream stalls before producing any output', async () => {
    const stalled = new InferenceStreamStalledError(180_000);
    const healthyChunks = [
      StreamInferenceResponseChunk.text('Die Zugspitze ist der höchste Berg.'),
      finishChunk('stop'),
    ];
    const execute = jest
      .fn()
      .mockReturnValueOnce(throwError(() => stalled))
      .mockReturnValueOnce(from(healthyChunks));
    const { service, savedMessages } = buildServiceWithStream(execute);

    await consume(service);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(savedMessages).toHaveLength(1);
    const [text] = savedMessages[0].content;
    expect((text as TextMessageContent).text).toContain('Zugspitze');
  });

  it('does not retry a stall that happens after output was streamed', async () => {
    const stalled = new InferenceStreamStalledError(180_000);
    // Emit the text a macrotask before the error so the consumer actually
    // receives it, as it would with a real provider stream.
    const execute = jest.fn().mockReturnValueOnce(
      new Observable<StreamInferenceResponseChunk>((subscriber) => {
        subscriber.next(
          StreamInferenceResponseChunk.text('Die Antwort beginnt'),
        );
        setTimeout(() => subscriber.error(stalled), 0);
      }),
    );
    const { service } = buildServiceWithStream(execute);

    await expect(consume(service)).rejects.toThrow(InferenceStreamStalledError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-stall stream failures', async () => {
    const execute = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('provider exploded')));
    const { service } = buildServiceWithStream(execute);

    await expect(consume(service)).rejects.toThrow('provider exploded');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('treats a tool call that streamed no arguments as an empty object', async () => {
    const { service, savedMessages } = buildService([
      toolCallChunk({ id: 'call_1', name: 'list_letterheads' }),
      finishChunk('tool_calls'),
    ]);

    await consume(service);

    const toolUses = savedMessages[0].content.filter(
      (block): block is ToolUseMessageContent =>
        block instanceof ToolUseMessageContent,
    );
    expect(toolUses).toHaveLength(1);
    expect(toolUses[0].params).toEqual({});
  });
});
