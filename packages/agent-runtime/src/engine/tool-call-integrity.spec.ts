import { describe, expect, it, vi } from 'vitest';
import { RunAbortedError } from '../contracts/errors';
import type { Hook, ModelCallInterruptedContext } from '../contracts/hook';
import type {
  ModelProvider,
  ProviderChunk,
  Usage,
} from '../contracts/provider';
import type { Tool } from '../contracts/tool';
import { MockProvider } from '../providers/mock/mock-provider';
import { baseInput, collectEvents } from './test-helpers';

/**
 * A model response whose tool-call arguments did not arrive intact (unparseable
 * JSON, or the token limit hit mid-call) must fail the run instead of executing
 * the tool with guessed input — executing with `{}` fails schema validation
 * identically on every retry, which produced the endless document-creation
 * loop of AYC-646.
 */
describe('tool-call argument integrity', () => {
  const documentTool = (execute = vi.fn(() => 'created')): Tool => ({
    name: 'create_document',
    description: 'Creates a document',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['title', 'content'],
    },
    execute,
  });

  const malformedDocumentTurn = (
    options: {
      prefix?: readonly ProviderChunk[];
      id?: string;
      argumentsDelta?: string;
      finishReason?: 'tool_calls' | 'length';
      usage?: Usage;
    } = {},
  ): ProviderChunk[] => [
    ...(options.prefix ?? []),
    {
      toolCallDeltas: [
        { index: 0, id: options.id ?? 'call_bad', name: 'create_document' },
      ],
    },
    {
      toolCallDeltas: [
        { index: 0, argumentsDelta: options.argumentsDelta ?? '{"title":' },
      ],
    },
    {
      finishReason: options.finishReason ?? 'tool_calls',
      usage: options.usage,
    },
  ];

  it('fails the run with MALFORMED_TOOL_CALL when final arguments are unparseable', async () => {
    const execute = vi.fn(() => 'created');
    const malformedTurn = malformedDocumentTurn({
      id: 'call_1',
      argumentsDelta:
        '{"title":"Parkraumkonzept","content":"<h1>Bericht</h1><p>Sehr geehrte Damen',
    });
    const provider = new MockProvider([
      malformedTurn,
      malformedTurn,
      malformedTurn,
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool(execute)] }),
    );

    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('MALFORMED_TOOL_CALL');
    expect(provider.requests).toHaveLength(4);
    expect(provider.requests[3].tools).toEqual([]);
    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('error');
    expect(execute).not.toHaveBeenCalled();
  });

  it('retries a malformed tool-only turn before anything visible is emitted', async () => {
    const execute = vi.fn(() => 'created');
    const provider = new MockProvider([
      malformedDocumentTurn({
        argumentsDelta: '{"title":"Incomplete"',
        usage: { inputTokens: 3, outputTokens: 2 },
      }),
      [
        {
          toolCallDeltas: [
            { index: 0, id: 'call_good', name: 'create_document' },
          ],
        },
        {
          toolCallDeltas: [
            {
              index: 0,
              argumentsDelta:
                '{"title":"Parkraumkonzept","content":"Completed"}',
            },
          ],
        },
        {
          finishReason: 'tool_calls',
          usage: { inputTokens: 5, outputTokens: 4 },
        },
      ],
      [
        { textDelta: 'Done.' },
        {
          finishReason: 'stop',
          usage: { inputTokens: 7, outputTokens: 6 },
        },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool(execute)] }),
    );

    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(events.find((event) => event.type === 'run_end')?.status).toBe(
      'completed',
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(provider.requests).toHaveLength(3);
    expect(events).not.toContainEqual(
      expect.objectContaining({
        type: 'tool_call_snapshot',
        toolCall: expect.objectContaining({ id: 'call_bad' }),
      }),
    );
    expect(events.find((event) => event.type === 'run_end')?.usage).toEqual({
      inputTokens: 15,
      outputTokens: 12,
    });
  });

  it('falls back to a tool-disabled answer after malformed retries are exhausted', async () => {
    const execute = vi.fn(() => 'created');
    const malformedTurn = malformedDocumentTurn({
      usage: { inputTokens: 2, outputTokens: 1 },
    });
    const provider = new MockProvider([
      malformedTurn,
      malformedTurn,
      malformedTurn,
      [
        { textDelta: 'I could not complete the requested tool action.' },
        {
          finishReason: 'stop',
          usage: { inputTokens: 5, outputTokens: 3 },
        },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool(execute)] }),
    );

    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(events.find((event) => event.type === 'run_end')).toMatchObject({
      status: 'completed',
      usage: { inputTokens: 11, outputTokens: 6 },
    });
    expect(provider.requests).toHaveLength(4);
    expect(provider.requests[3]).toMatchObject({
      tools: [],
      instructions: expect.stringContaining('Do not call tools'),
    });
    expect(provider.requests[3].toolChoice).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects tool calls hallucinated by the tool-disabled fallback', async () => {
    const execute = vi.fn(() => 'created');
    const afterModelCall = vi.fn();
    const interruptions: string[] = [];
    const observer: Hook = {
      name: 'fallback-observer',
      afterModelCall,
      modelCallInterrupted: (ctx) => {
        interruptions.push(
          ctx.message.content
            .filter((content) => content.type === 'text')
            .map((content) => content.text)
            .join(''),
        );
      },
    };
    const malformedTurn = malformedDocumentTurn();
    const provider = new MockProvider([
      malformedTurn,
      malformedTurn,
      malformedTurn,
      [
        { textDelta: 'I cannot safely complete this action.' },
        {
          toolCallDeltas: [
            { index: 0, id: 'fallback_call', name: 'create_document' },
          ],
        },
        {
          toolCallDeltas: [
            {
              index: 0,
              argumentsDelta: '{"title":"Unsafe","content":"Do not run"}',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, {
        tools: [documentTool(execute)],
        hooks: [observer],
      }),
    );

    expect(events.find((event) => event.type === 'error')?.code).toBe(
      'MALFORMED_TOOL_CALL',
    );
    expect(events).not.toContainEqual(
      expect.objectContaining({
        type: 'tool_call_snapshot',
        toolCall: expect.objectContaining({ id: 'fallback_call' }),
      }),
    );
    expect(afterModelCall).not.toHaveBeenCalled();
    expect(interruptions).toHaveLength(4);
    expect(interruptions.at(-1)).toBe('I cannot safely complete this action.');
    expect(execute).not.toHaveBeenCalled();
  });

  it('preserves cancellation during the tool-disabled fallback', async () => {
    const malformedTurn = malformedDocumentTurn();
    const scripted = new MockProvider([
      malformedTurn,
      malformedTurn,
      malformedTurn,
    ]);
    let calls = 0;
    const provider: ModelProvider = {
      name: 'abort-fallback',
      async *stream(request) {
        calls += 1;
        if (calls === 4) throw new RunAbortedError();
        yield* scripted.stream(request);
      },
    };

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool()] }),
    );

    expect(calls).toBe(4);
    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(events.find((event) => event.type === 'run_end')?.status).toBe(
      'aborted',
    );
  });

  it('shares one total budget across empty and malformed retries', async () => {
    const malformedTurn = malformedDocumentTurn({
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    const provider = new MockProvider([
      malformedTurn,
      [{ finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 0 } }],
      malformedTurn,
      malformedTurn,
      [{ textDelta: 'A fifth attempt must not run.' }],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool()] }),
    );

    expect(events.find((event) => event.type === 'error')?.code).toBe(
      'MALFORMED_TOOL_CALL',
    );
    expect(provider.requests).toHaveLength(4);
    expect(events.find((event) => event.type === 'run_end')?.usage).toEqual({
      inputTokens: 4,
      outputTokens: 3,
    });
  });

  it('fails the run when the token limit is reached while emitting a tool call', async () => {
    const execute = vi.fn(() => 'created');
    const truncatedTurn = malformedDocumentTurn({
      id: 'call_1',
      argumentsDelta: '{"title":"Bericht","content":"<h1>Kurz</h1>"}',
      finishReason: 'length',
    });
    const provider = new MockProvider([
      truncatedTurn,
      truncatedTurn,
      truncatedTurn,
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool(execute)] }),
    );

    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('MALFORMED_TOOL_CALL');
    expect(provider.requests).toHaveLength(4);
    expect(provider.requests[3].tools).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it('fires modelCallInterrupted so intact text of the malformed turn can be persisted', async () => {
    const interruptions: { reason: string; text: string }[] = [];
    const observer: Hook = {
      name: 'observer',
      modelCallInterrupted: (ctx: ModelCallInterruptedContext) => {
        const text = ctx.message.content
          .filter((content) => content.type === 'text')
          .map((content) => content.text)
          .join('');
        interruptions.push({ reason: ctx.reason, text });
      },
    };
    const provider = new MockProvider([
      malformedDocumentTurn({
        prefix: [{ textDelta: 'Ich erstelle jetzt das Dokument.' }],
        id: 'call_1',
        argumentsDelta: '{"title":"Bericht","content":"<h1>',
      }),
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool()], hooks: [observer] }),
    );

    // The turn's streamed text must reach the interruption hook — it is what
    // persists partial display content when a model call fails (AYC-613).
    expect(interruptions).toEqual([
      { reason: 'error', text: 'Ich erstelle jetzt das Dokument.' },
    ]);
    expect(provider.requests).toHaveLength(1);
    const error = events.find((event) => event.type === 'error');
    expect(error?.code).toBe('MALFORMED_TOOL_CALL');
  });

  it('does not retry after visible thinking was emitted', async () => {
    const provider = new MockProvider([
      malformedDocumentTurn({
        prefix: [{ thinkingDelta: 'I will create the document.' }],
      }),
      [{ textDelta: 'A retry must not run.' }],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool()] }),
    );

    expect(provider.requests).toHaveLength(1);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'thinking_delta',
        delta: 'I will create the document.',
      }),
    );
    expect(events.find((event) => event.type === 'error')?.code).toBe(
      'MALFORMED_TOOL_CALL',
    );
  });

  it('honors an abort requested by the interruption hook', async () => {
    const abortingHook: Hook = {
      name: 'abort-on-interruption',
      modelCallInterrupted: (ctx) => ctx.abort('stop recovery'),
    };
    const provider = new MockProvider([
      malformedDocumentTurn(),
      [{ textDelta: 'A retry must not run.' }],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool()], hooks: [abortingHook] }),
    );

    expect(provider.requests).toHaveLength(1);
    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(events.find((event) => event.type === 'run_end')?.status).toBe(
      'aborted',
    );
  });

  it('still executes a tool call that streamed no arguments at all', async () => {
    const execute = vi.fn(() => 'three letterheads');
    const listTool: Tool = {
      name: 'list_letterheads',
      description: 'Lists available letterheads',
      parameters: { type: 'object', properties: {} },
      execute,
    };
    const provider = new MockProvider([
      [
        {
          toolCallDeltas: [
            { index: 0, id: 'call_1', name: 'list_letterheads' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      [{ textDelta: 'Done.' }, { finishReason: 'stop' }],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [listTool] }),
    );

    expect(execute).toHaveBeenCalledWith({}, expect.anything());
    const end = events.find((event) => event.type === 'run_end');
    expect(end?.status).toBe('completed');
  });
});
