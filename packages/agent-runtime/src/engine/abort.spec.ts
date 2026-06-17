import { describe, expect, it } from 'vitest';

import type { Hook } from '../contracts/hook';
import type { ProviderChunk, ProviderRequest } from '../contracts/provider';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool } from './test-helpers';

describe('abort handling', () => {
  it('ends with status aborted when the signal fires mid-stream', async () => {
    const controller = new AbortController();
    const model = new MockProvider([]);
    model.stream = async function* (): AsyncIterable<ProviderChunk> {
      await Promise.resolve();
      yield { textDelta: 'first' };
      controller.abort();
      yield { textDelta: 'second' };
    };
    const events = await collectEvents(
      baseInput(model, { signal: controller.signal }),
    );

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });

  it('stops before the next iteration when a tool aborts via signal', async () => {
    const controller = new AbortController();
    const abortingTool = echoTool({
      execute: () => {
        controller.abort();
        return 'done anyway';
      },
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('never reached'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [abortingTool], signal: controller.signal }),
    );

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('stops before the model call when a beforeModelCall hook aborts', async () => {
    const abortOnSecond: Hook = {
      name: 'abort-on-second',
      beforeModelCall: (ctx) => {
        if (ctx.iteration === 1) {
          ctx.abort('enough');
        }
      },
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('never reached'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [abortOnSecond] }),
    );

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('exposes the abort signal to tool executions', async () => {
    const controller = new AbortController();
    let seenSignal: AbortSignal | undefined;
    const observingTool = echoTool({
      execute: (_input, ctx) => {
        seenSignal = ctx.signal;
        return 'ok';
      },
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('Done'),
    ]);
    await collectEvents(
      baseInput(model, { tools: [observingTool], signal: controller.signal }),
    );

    expect(seenSignal).toBe(controller.signal);
  });

  it('passes the signal through to the provider request', async () => {
    const controller = new AbortController();
    let seenSignal: AbortSignal | undefined;
    const model = new MockProvider([textTurn('Hi')]);
    const originalStream = model.stream.bind(model);
    model.stream = (request: ProviderRequest) => {
      seenSignal = request.signal;
      return originalStream(request);
    };
    await collectEvents(baseInput(model, { signal: controller.signal }));

    expect(seenSignal).toBe(controller.signal);
  });

  it('does not execute the tool when a beforeToolCall hook aborts', async () => {
    let executed = false;
    const observingTool = echoTool({
      execute: () => {
        executed = true;
        return 'ran';
      },
    });
    const gate: Hook = {
      name: 'gate',
      beforeToolCall: (ctx) => ctx.abort('blocked'),
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('never reached'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [observingTool], hooks: [gate] }),
    );

    expect(executed).toBe(false);
    const toolResult = events.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({
      isError: true,
      result: expect.stringContaining('aborted'),
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('ends as aborted when afterModelCall aborts on a final turn', async () => {
    const abortAtEnd: Hook = {
      name: 'abort-at-end',
      afterModelCall: (ctx) => ctx.abort('stop'),
    };
    const model = new MockProvider([textTurn('Final answer')]);
    const events = await collectEvents(
      baseInput(model, { hooks: [abortAtEnd] }),
    );

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });

  it('pairs every tool_use with a result when aborting mid-batch', async () => {
    const controller = new AbortController();
    const abortingTool = echoTool({
      execute: (input) => {
        controller.abort();
        return `ran: ${String(input.value)}`;
      },
    });
    const twoCallTurn: ProviderChunk[] = [
      {
        toolCallDeltas: [
          { index: 0, id: 'c1', name: 'echo', argumentsDelta: '{"value":"a"}' },
          { index: 1, id: 'c2', name: 'echo', argumentsDelta: '{"value":"b"}' },
        ],
      },
      { finishReason: 'tool_calls' },
    ];
    const model = new MockProvider([twoCallTurn]);
    const events = await collectEvents(
      baseInput(model, { tools: [abortingTool], signal: controller.signal }),
    );

    const resultsMessage = events.find((e) => e.type === 'tool_result_message');
    expect(resultsMessage).toBeDefined();
    if (resultsMessage?.type === 'tool_result_message') {
      expect(resultsMessage.message.content).toHaveLength(2);
      expect(resultsMessage.message.content[0]).toMatchObject({
        toolCallId: 'c1',
        result: 'ran: a',
      });
      expect(resultsMessage.message.content[1]).toMatchObject({
        toolCallId: 'c2',
        isError: true,
        result: expect.stringContaining('aborted'),
      });
    }
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });
});
