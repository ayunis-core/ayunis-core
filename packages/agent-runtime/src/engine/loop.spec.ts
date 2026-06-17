import { describe, expect, it } from 'vitest';

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

  it('stops at the iteration cap with an error event', async () => {
    const callTurn = (): ReturnType<typeof toolCallTurn> =>
      toolCallTurn({ id: 'call', name: 'echo', input: { value: 'again' } });
    const model = new MockProvider([callTurn(), callTurn(), callTurn()]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()], maxIterations: 2 }),
    );

    const error = events.find((e) => e.type === 'error');
    expect(error).toMatchObject({ code: 'MAX_ITERATIONS_REACHED' });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'max_iterations',
    });
    expect(model.requests).toHaveLength(2);
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
