import { describe, expect, it, vi } from 'vitest';

import type { RunEvent } from '../contracts/event';
import { AgentRuntimeError } from '../contracts/errors';
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

  it('records an externally handled tool before exiting', async () => {
    const externallyHandled = echoTool({
      name: 'request_approval',
      execute: undefined,
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'call-1',
        name: 'request_approval',
        input: { value: 'x' },
      }),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [externallyHandled] }),
    );

    expect(events.find((event) => event.type === 'tool_result')).toMatchObject({
      toolCallId: 'call-1',
      result: 'Tool execution is handled externally',
      isError: false,
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('returns the validation error and keeps looping when an externally handled call has invalid input', async () => {
    const externallyHandled = echoTool({
      name: 'schedule_approval',
      execute: undefined,
      validateInput: (input) => {
        if (input.start === 'not-a-date') {
          throw new Error(
            "'start' must be a valid ISO 8601 date-time, received 'not-a-date'",
          );
        }
      },
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'call-1',
        name: 'schedule_approval',
        input: { start: 'not-a-date' },
      }),
      toolCallTurn({
        id: 'call-2',
        name: 'schedule_approval',
        input: { start: '2026-01-31T14:30:00Z' },
      }),
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [externallyHandled] }),
    );

    const toolResults = events.filter((event) => event.type === 'tool_result');
    expect(toolResults[0]).toMatchObject({
      toolCallId: 'call-1',
      result:
        "'start' must be a valid ISO 8601 date-time, received 'not-a-date'",
      isError: true,
    });
    expect(toolResults[1]).toMatchObject({
      toolCallId: 'call-2',
      result: 'Tool execution is handled externally',
      isError: false,
    });
    // The invalid call must not end the run — the model sees the error,
    // retries, and only the valid retry exits the loop.
    expect(model.requests).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('consults validateInput before execute and skips execution on failure', async () => {
    const execute = vi.fn(() => 'should not run');
    const guarded = echoTool({
      execute,
      validateInput: (input) => {
        if (input.value === 'bad') {
          throw new Error("'value' is not acceptable");
        }
      },
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: 'bad' } }),
      textTurn('Giving up'),
    ]);

    const events = await collectEvents(baseInput(model, { tools: [guarded] }));

    expect(events.find((event) => event.type === 'tool_result')).toMatchObject({
      toolCallId: 'call-1',
      result: "'value' is not acceptable",
      isError: true,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('keeps looping when a valid external sibling accompanies an invalid one', async () => {
    const externallyHandled = echoTool({
      name: 'schedule_approval',
      execute: undefined,
      validateInput: (input) => {
        if (input.start === 'not-a-date') {
          throw new Error('invalid start');
        }
      },
    });
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'call-1',
              name: 'schedule_approval',
              argumentsDelta: '{"start":"2026-01-31T14:30:00Z"}',
            },
            {
              index: 1,
              id: 'call-2',
              name: 'schedule_approval',
              argumentsDelta: '{"start":"not-a-date"}',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      toolCallTurn({
        id: 'call-3',
        name: 'schedule_approval',
        input: { start: '2026-02-01T09:00:00Z' },
      }),
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [externallyHandled] }),
    );

    // The valid sibling must not end the turn while the invalid call still
    // needs a retry: the model gets both results and goes again.
    expect(model.requests).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('keeps looping when an external sibling accompanies an invalid executable call', async () => {
    const executeChart = vi.fn(() => 'acknowledged');
    const guardedChart = echoTool({
      name: 'chart_data',
      execute: executeChart,
      validateInput: () => {
        throw new Error('invalid chart data');
      },
    });
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'approval-1',
              name: 'request_approval',
              argumentsDelta: '{}',
            },
            {
              index: 1,
              id: 'chart-1',
              name: 'chart_data',
              argumentsDelta: '{}',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      textTurn('Please provide corrected chart data.'),
    ]);

    await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({ name: 'request_approval', execute: undefined }),
          guardedChart,
        ],
      }),
    );

    expect(model.requests).toHaveLength(2);
    expect(executeChart).not.toHaveBeenCalled();
  });

  it('settles executable siblings in the externally handled turn', async () => {
    const executeLookup = vi.fn(() => 'Berlin budget results');
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'chart-1',
              name: 'request_approval',
              argumentsDelta: '{"value":"budget"}',
            },
            {
              index: 1,
              id: 'lookup-1',
              name: 'budget_lookup',
              argumentsDelta: '{"value":"Berlin"}',
            },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({ name: 'request_approval', execute: undefined }),
          echoTool({ name: 'budget_lookup', execute: executeLookup }),
        ],
      }),
    );

    expect(events.filter((event) => event.type === 'tool_result')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolCallId: 'chart-1',
          result: 'Tool execution is handled externally',
          isError: false,
        }),
        expect.objectContaining({
          toolCallId: 'lookup-1',
          result: 'Berlin budget results',
          isError: false,
        }),
      ]),
    );
    expect(executeLookup).toHaveBeenCalledOnce();
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

  it('stops the run when a tool throws a fatal runtime error', async () => {
    const failing = echoTool({
      name: 'pii_lookup',
      execute: () => {
        throw new AgentRuntimeError(
          'ANONYMIZATION_UNAVAILABLE',
          'Anonymization is unavailable',
        );
      },
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'pii_lookup', input: {} }),
      textTurn('This turn must not run'),
    ]);

    const events = await collectEvents(baseInput(model, { tools: [failing] }));

    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'ANONYMIZATION_UNAVAILABLE',
    });
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
    expect(model.requests).toHaveLength(1);
  });

  it('pairs every tool call before surfacing a fatal runtime error', async () => {
    const firstExecute = vi.fn(() => 'first result');
    const failingExecute = vi.fn(() => {
      throw new AgentRuntimeError(
        'ANONYMIZATION_UNAVAILABLE',
        'Anonymization is unavailable',
      );
    });
    const skippedExecute = vi.fn(() => 'must not run');
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            { index: 0, id: 'call-1', name: 'first', argumentsDelta: '{}' },
            { index: 1, id: 'call-2', name: 'failing', argumentsDelta: '{}' },
            { index: 2, id: 'call-3', name: 'skipped', argumentsDelta: '{}' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      textTurn('This turn must not run'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({ name: 'first', execute: firstExecute }),
          echoTool({ name: 'failing', execute: failingExecute }),
          echoTool({ name: 'skipped', execute: skippedExecute }),
        ],
      }),
    );

    const resultMessage = events.find(
      (event) => event.type === 'tool_result_message',
    );
    expect(resultMessage).toMatchObject({
      message: {
        role: 'tool_result',
        content: [
          { toolCallId: 'call-1', isError: false },
          { toolCallId: 'call-2', isError: true },
          { toolCallId: 'call-3', isError: true },
        ],
      },
    });
    expect(firstExecute).toHaveBeenCalledOnce();
    expect(failingExecute).toHaveBeenCalledOnce();
    expect(skippedExecute).not.toHaveBeenCalled();
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'ANONYMIZATION_UNAVAILABLE',
    });
    expect(eventTypes(events).indexOf('tool_result_message')).toBeLessThan(
      eventTypes(events).indexOf('error'),
    );
    expect(model.requests).toHaveLength(1);
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

  it('retries an empty provider response before failing the run', async () => {
    const model = new MockProvider([[], textTurn('Recovered')]);

    const events = await collectEvents(baseInput(model));

    expect(model.requests).toHaveLength(2);
    expect(
      events.find((event) => event.type === 'assistant_message'),
    ).toMatchObject({
      message: {
        content: [{ type: 'text', text: 'Recovered' }],
      },
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('retains usage from an empty attempt that recovers', async () => {
    const model = new MockProvider([
      [{ finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 0 } }],
      textTurn('Recovered', { inputTokens: 15, outputTokens: 4 }),
    ]);

    const events = await collectEvents(baseInput(model));

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
      usage: { inputTokens: 27, outputTokens: 4 },
    });
  });

  it('retains empty-attempt usage when the retry fails', async () => {
    const afterModelCall = vi.fn();
    const model = new MockProvider([
      [{ finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 0 } }],
    ]);
    const firstStream = model.stream.bind(model);
    model.stream = (request) => {
      if (model.requests.length === 0) return firstStream(request);
      throw new Error('retry failed');
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [{ name: 'usage-observer', afterModelCall }],
      }),
    );

    expect(afterModelCall).toHaveBeenCalledWith(
      expect.objectContaining({ usage: { inputTokens: 12, outputTokens: 0 } }),
    );
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'error',
      usage: { inputTokens: 12, outputTokens: 0 },
    });
  });

  it('records an empty attempt without retrying after cancellation', async () => {
    const controller = new AbortController();
    const afterModelCall = vi.fn();
    const model = new MockProvider([
      [{ finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 0 } }],
    ]);
    const firstStream = model.stream.bind(model);
    model.stream = async function* (request) {
      yield* firstStream(request);
      controller.abort();
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [{ name: 'usage-observer', afterModelCall }],
        signal: controller.signal,
      }),
    );

    expect(model.requests).toHaveLength(1);
    expect(afterModelCall).toHaveBeenCalledWith(
      expect.objectContaining({ usage: { inputTokens: 12, outputTokens: 0 } }),
    );
    expect(eventTypes(events)).toEqual(['run_start', 'run_end']);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'aborted' });
  });

  it('rejects repeated provider responses without assistant content', async () => {
    const model = new MockProvider([[], []]);

    const events = await collectEvents(baseInput(model));

    expect(model.requests).toHaveLength(2);
    expect(eventTypes(events)).toEqual(['run_start', 'error', 'run_end']);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_FAILED',
      message: 'Model provider returned an empty response',
    });
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('preserves classified AgentRuntimeError failures from model providers', async () => {
    const model = new MockProvider([]);
    model.stream = () => {
      throw new AgentRuntimeError(
        'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
        'Provider anthropic request timed out',
        {
          details: {
            hostError: {
              type: 'provider_timeout',
              context: {
                provider: 'anthropic',
                modelId: 'claude-3-7-sonnet',
              },
            },
          },
        },
      );
    };

    const events = await collectEvents(baseInput(model));

    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
      message: 'Provider anthropic request timed out',
      details: {
        hostError: {
          type: 'provider_timeout',
          context: {
            provider: 'anthropic',
            modelId: 'claude-3-7-sonnet',
          },
        },
      },
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

    expect(afterModelCall).toHaveBeenCalledTimes(2);
    expect(afterModelCall).toHaveBeenNthCalledWith(
      1,
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
