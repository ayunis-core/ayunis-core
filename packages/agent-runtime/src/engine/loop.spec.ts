import { describe, expect, it, vi } from 'vitest';

import type { RunEvent } from '../contracts/event';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool, eventTypes } from './test-helpers';

describe('the agent loop', () => {
  it('completes after a single text-only turn', async () => {
    const model = new MockProvider([textTurn('Hello there')]);
    const events = await collectEvents(baseInput(model));

    expect(eventTypes(events)).toEqual([
      'run_start',
      'text_delta',
      'text_delta',
      'assistant_message',
      'run_end',
    ]);
    const runEnd = events.at(-1);
    expect(runEnd).toMatchObject({ type: 'run_end', status: 'completed' });
    expect(model.requests).toHaveLength(1);
  });

  it('reassembles text deltas into the assistant message', async () => {
    const model = new MockProvider([textTurn('Hello there')]);
    const events = await collectEvents(baseInput(model));

    const message = events.find((e) => e.type === 'assistant_message');
    expect(message).toMatchObject({
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello there' }],
      },
    });
  });

  it('executes a tool call and iterates until the model stops', async () => {
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: '42' } }),
      textTurn('The echo said 42'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()] }),
    );

    expect(eventTypes(events)).toEqual([
      'run_start',
      'tool_call_snapshot',
      'tool_call_snapshot',
      'tool_call_snapshot',
      'tool_call',
      'assistant_message',
      'tool_result',
      'tool_result_message',
      'text_delta',
      'text_delta',
      'assistant_message',
      'run_end',
    ]);
    const toolResult = events.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({
      toolCallId: 'call-1',
      toolName: 'echo',
      result: 'echo: 42',
      isError: false,
    });
    expect(model.requests).toHaveLength(2);
  });

  it('emits progressive tool-call snapshots before the finalized call', async () => {
    const model = new MockProvider([
      toolCallTurn({
        id: 'call-1',
        name: 'echo',
        input: { value: 'progressive' },
      }),
      textTurn('Done'),
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()] }),
    );

    expect(
      events.filter((event) => event.type === 'tool_call_snapshot'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolCall: expect.objectContaining({
            index: 0,
            id: 'call-1',
            name: 'echo',
            status: 'streaming',
          }),
        }),
        expect.objectContaining({
          toolCall: expect.objectContaining({
            index: 0,
            argumentsJson: expect.any(String),
            status: 'streaming',
          }),
        }),
      ]),
    );
    expect(eventTypes(events).indexOf('tool_call_snapshot')).toBeLessThan(
      eventTypes(events).indexOf('tool_call'),
    );
  });

  it('emits an invalid terminal snapshot when streamed tool input never becomes valid', async () => {
    const model = new MockProvider([
      [
        {
          textDelta: 'I will search for that.',
          toolCallDeltas: [
            {
              index: 0,
              id: 'call-1',
              name: 'internet_search',
              argumentsDelta: '{"query":',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(baseInput(model));
    const snapshots = events.filter(
      (event) => event.type === 'tool_call_snapshot',
    );

    expect(snapshots).toEqual([
      expect.objectContaining({
        toolCall: expect.objectContaining({
          argumentsJson: '{"query":',
          status: 'streaming',
        }),
      }),
      expect.objectContaining({
        toolCall: expect.objectContaining({
          argumentsJson: '{"query":',
          status: 'invalid',
        }),
      }),
    ]);
  });

  it('sends the tool result back to the model on the next iteration', async () => {
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: '42' } }),
      textTurn('Done'),
    ]);
    await collectEvents(baseInput(model, { tools: [echoTool()] }));

    const secondRequest = model.requests[1];
    const lastMessage = secondRequest.messages.at(-1);
    expect(lastMessage).toMatchObject({
      role: 'tool_result',
      content: [
        {
          type: 'tool_result',
          toolCallId: 'call-1',
          toolName: 'echo',
          result: 'echo: 42',
        },
      ],
    });
  });

  it('exits without executing when a display-only tool is called', async () => {
    const displayOnly = echoTool({ name: 'show_chart', execute: undefined });
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'show_chart', input: { value: 'x' } }),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [displayOnly] }),
    );

    expect(eventTypes(events)).not.toContain('tool_result');
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('returns an error result for unknown tools and keeps looping', async () => {
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'missing_tool', input: {} }),
      textTurn('Recovered'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()] }),
    );

    const toolResult = events.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({ isError: true });
    expect(toolResult).toMatchObject({
      result: expect.stringContaining('was not found'),
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(model.requests).toHaveLength(2);
  });

  it.each([
    {
      label: 'missing provider id',
      delta: { index: 0, name: 'echo', argumentsDelta: '{"value":"x"}' },
    },
    {
      label: 'blank tool name',
      delta: { index: 0, id: 'call-1', name: ' ', argumentsDelta: '{}' },
    },
    {
      label: 'unrecoverable arguments',
      delta: {
        index: 0,
        id: 'call-1',
        name: 'echo',
        argumentsDelta: '{"value":',
      },
    },
  ])('does not execute a tool call with $label', async ({ delta }) => {
    const model = new MockProvider([
      [{ toolCallDeltas: [delta] }, { finishReason: 'tool_calls' }],
    ]);
    const execute = vi.fn(() => 'side effect completed');

    const events = await collectEvents(
      baseInput(model, { tools: [echoTool({ execute })] }),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(eventTypes(events)).not.toContain('tool_call');
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('turns tool execution failures into error results without throwing', async () => {
    const failing = echoTool({
      name: 'broken',
      execute: () => {
        throw new Error('boom');
      },
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'broken', input: {} }),
      textTurn('Recovered'),
    ]);
    const events = await collectEvents(baseInput(model, { tools: [failing] }));

    const toolResult = events.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({ result: 'boom', isError: true });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('preserves an explicit error status returned by a tool', async () => {
    const reportedFailure = echoTool({
      name: 'records_lookup',
      execute: () => ({
        result: 'The record service is temporarily unavailable',
        isError: true,
      }),
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'records_lookup', input: {} }),
      textTurn('I could not retrieve the record.'),
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [reportedFailure] }),
    );

    expect(events.find((event) => event.type === 'tool_result')).toMatchObject({
      result: 'The record service is temporarily unavailable',
      isError: true,
    });
  });

  it('withholds the grouped tool-result message until the final tool hook succeeds', async () => {
    const finalCallFlags: boolean[] = [];
    const persistence = {
      name: 'persistence',
      afterToolCall: (ctx: { isLastToolCall: boolean }) => {
        finalCallFlags.push(ctx.isLastToolCall);
        if (ctx.isLastToolCall) {
          throw new Error('tool-result persistence failed');
        }
      },
    };
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'call-1',
              name: 'echo',
              argumentsDelta: '{"value":"one"}',
            },
            {
              index: 1,
              id: 'call-2',
              name: 'echo',
              argumentsDelta: '{"value":"two"}',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [persistence] }),
    );

    expect(finalCallFlags).toEqual([false, true]);
    expect(eventTypes(events)).not.toContain('tool_result_message');
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('executes complete tool phases up to the iteration cap', async () => {
    const callTurn = (): ReturnType<typeof toolCallTurn> =>
      toolCallTurn({ id: 'call', name: 'echo', input: { value: 'again' } });
    const model = new MockProvider([callTurn(), callTurn(), callTurn()]);
    const execute = vi.fn(
      (input: Record<string, unknown>) => `echo: ${String(input.value)}`,
    );
    const events = await collectEvents(
      baseInput(model, {
        tools: [echoTool({ execute })],
        maxIterations: 2,
      }),
    );

    const error = events.find((e) => e.type === 'error');
    expect(error).toMatchObject({ code: 'MAX_ITERATIONS_REACHED' });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'max_iterations',
    });
    expect(model.requests).toHaveLength(2);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(events.filter((event) => event.type === 'tool_result')).toHaveLength(
      2,
    );
  });

  it('aggregates usage across iterations into run_end', async () => {
    const model = new MockProvider([
      toolCallTurn(
        { id: 'call-1', name: 'echo', input: { value: 'x' } },
        { inputTokens: 10, outputTokens: 5 },
      ),
      textTurn('Done', { inputTokens: 20, outputTokens: 7 }),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()] }),
    );

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      usage: { inputTokens: 30, outputTokens: 12 },
    });
  });

  it('surfaces provider failures as an error event + run_end error', async () => {
    const model = new MockProvider([]);
    model.stream = () => {
      throw new Error('connection refused');
    };
    const events = await collectEvents(baseInput(model));

    const error = events.find((e) => e.type === 'error');
    expect(error).toMatchObject({
      code: 'PROVIDER_FAILED',
      message: 'connection refused',
    });
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('rejects a provider response without assistant content', async () => {
    const model = new MockProvider([[]]);

    const events = await collectEvents(baseInput(model));

    expect(eventTypes(events)).toEqual(['run_start', 'error', 'run_end']);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_FAILED',
      message: 'Model provider returned an empty response',
    });
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('preserves reported usage when rejecting metadata-only output', async () => {
    const afterModelCall = vi.fn();
    const model = new MockProvider([
      [
        {
          finishReason: 'stop',
          usage: { inputTokens: 12, outputTokens: 0 },
        },
      ],
    ]);

    const events = await collectEvents(
      baseInput(model, {
        hooks: [{ name: 'usage-observer', afterModelCall }],
      }),
    );

    expect(afterModelCall).toHaveBeenCalledTimes(1);
    expect(afterModelCall).toHaveBeenCalledWith(
      expect.objectContaining({ usage: { inputTokens: 12, outputTokens: 0 } }),
    );
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
      usage: { inputTokens: 12, outputTokens: 0 },
    });
  });

  it('stamps every event with the run envelope', async () => {
    const model = new MockProvider([textTurn('Hi')]);
    const events = await collectEvents(baseInput(model));

    const isEnvelope = (event: RunEvent): boolean =>
      typeof event.runId === 'string' &&
      event.depth === 0 &&
      event.path.length === 1 &&
      typeof event.timestamp === 'string';
    expect(events.every(isEnvelope)).toBe(true);
    expect(new Set(events.map((e) => e.runId)).size).toBe(1);
  });
});
