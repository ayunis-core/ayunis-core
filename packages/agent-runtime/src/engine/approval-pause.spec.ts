import { describe, expect, it, vi } from 'vitest';

import type { Hook } from '../contracts/hook';
import type { ProviderChunk } from '../contracts/provider';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool, eventTypes } from './test-helpers';

const NOT_RUN_RESULT =
  'This tool call was not run because it needs approval and another tool call in this turn had invalid input. Call it again together with the corrected calls.';

const multiCallTurn = (
  calls: readonly { id: string; name: string; input: unknown }[],
): ProviderChunk[] => [
  {
    toolCallDeltas: calls.map((call, index) => ({
      index,
      id: call.id,
      name: call.name,
      argumentsDelta: JSON.stringify(call.input),
    })),
  },
  { finishReason: 'tool_calls' },
];

const recordingHook = () =>
  ({
    name: 'recorder',
    beforeToolCall: vi.fn<NonNullable<Hook['beforeToolCall']>>(),
    afterToolCall: vi.fn<NonNullable<Hook['afterToolCall']>>(),
    afterModelTurn: vi.fn<NonNullable<Hook['afterModelTurn']>>(),
  }) satisfies Hook;

describe('tools that need approval', () => {
  it('ends the run after the turn without running the call, its tool hooks or results', async () => {
    const execute = vi.fn(() => 'sent');
    const hook = recordingHook();
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'send', input: { value: 'x' } }),
      textTurn('must not be requested'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [echoTool({ name: 'send', needsApproval: true, execute })],
        hooks: [hook],
      }),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(hook.beforeToolCall).not.toHaveBeenCalled();
    expect(hook.afterToolCall).not.toHaveBeenCalled();
    expect(hook.afterModelTurn).toHaveBeenCalledOnce();
    expect(hook.afterModelTurn.mock.calls[0][0]).toMatchObject({
      outcome: { type: 'accepted' },
    });
    const types = eventTypes(events);
    expect(types).not.toContain('tool_result');
    expect(types).not.toContain('tool_result_message');
    expect(types.slice(-3)).toEqual([
      'tool_call',
      'assistant_message',
      'run_end',
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('runs none of the calls of a mixed turn, not even the externally handled one', async () => {
    const executeSend = vi.fn(() => 'sent');
    const executeLookup = vi.fn(() => 'looked up');
    const hook = recordingHook();
    const model = new MockProvider([
      multiCallTurn([
        { id: 'send-1', name: 'send', input: { value: 'x' } },
        { id: 'lookup-1', name: 'lookup', input: { value: 'y' } },
        { id: 'widget-1', name: 'widget', input: { value: 'z' } },
      ]),
      textTurn('must not be requested'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({ name: 'send', needsApproval: true, execute: executeSend }),
          echoTool({ name: 'lookup', execute: executeLookup }),
          echoTool({ name: 'widget', execute: undefined }),
        ],
        hooks: [hook],
      }),
    );

    expect(executeSend).not.toHaveBeenCalled();
    expect(executeLookup).not.toHaveBeenCalled();
    expect(hook.beforeToolCall).not.toHaveBeenCalled();
    expect(hook.afterToolCall).not.toHaveBeenCalled();
    expect(eventTypes(events)).not.toContain('tool_result');
    expect(eventTypes(events)).not.toContain('tool_result_message');
    expect(events.filter((event) => event.type === 'tool_call')).toHaveLength(
      3,
    );
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(model.requests).toHaveLength(1);
  });

  it('returns a sibling validation error to the model and keeps looping without running the approval call', async () => {
    const executeSend = vi.fn(() => 'sent');
    const model = new MockProvider([
      multiCallTurn([
        { id: 'send-1', name: 'send', input: { value: 'x' } },
        { id: 'schedule-1', name: 'schedule', input: { start: 'not-a-date' } },
      ]),
      textTurn('Let me correct that.'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({ name: 'send', needsApproval: true, execute: executeSend }),
          echoTool({
            name: 'schedule',
            execute: undefined,
            validateInput: () => {
              throw new Error('invalid start');
            },
          }),
        ],
      }),
    );

    expect(executeSend).not.toHaveBeenCalled();
    expect(events.filter((event) => event.type === 'tool_result')).toEqual([
      expect.objectContaining({
        toolCallId: 'send-1',
        result: NOT_RUN_RESULT,
        isError: true,
      }),
      expect.objectContaining({
        toolCallId: 'schedule-1',
        result: 'invalid start',
        isError: true,
      }),
    ]);
    expect(model.requests).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('does not count approval calls skipped for an invalid sibling as repeated failures', async () => {
    const mixedTurn = (attempt: number) =>
      multiCallTurn([
        { id: `send-${attempt}`, name: 'send', input: { value: 'x' } },
        {
          id: `schedule-${attempt}`,
          name: 'schedule',
          input: { start: `attempt-${attempt}` },
        },
      ]);
    const model = new MockProvider([
      mixedTurn(1),
      mixedTurn(2),
      mixedTurn(3),
      textTurn('Let me correct that.'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({ name: 'send', needsApproval: true }),
          echoTool({
            name: 'schedule',
            execute: undefined,
            validateInput: (input) => {
              throw new Error(`invalid start ${String(input.start)}`);
            },
          }),
        ],
      }),
    );

    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(model.requests).toHaveLength(4);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('keeps looping when the approval call itself has invalid input', async () => {
    const executeSend = vi.fn(() => 'sent');
    const model = new MockProvider([
      toolCallTurn({ id: 'send-1', name: 'send', input: { value: 'bad' } }),
      textTurn('Let me correct that.'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [
          echoTool({
            name: 'send',
            needsApproval: true,
            execute: executeSend,
            validateInput: () => {
              throw new Error('invalid value');
            },
          }),
        ],
      }),
    );

    expect(executeSend).not.toHaveBeenCalled();
    expect(events.find((event) => event.type === 'tool_result')).toMatchObject({
      toolCallId: 'send-1',
      result: 'invalid value',
      isError: true,
    });
    expect(model.requests).toHaveLength(2);
  });

  it('never runs an approval call that a beforeToolCall hook rewrote a call into', async () => {
    const executeSend = vi.fn(() => 'sent');
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: 'x' } }),
      textTurn('Done'),
    ]);

    await collectEvents(
      baseInput(model, {
        tools: [
          echoTool(),
          echoTool({ name: 'send', needsApproval: true, execute: executeSend }),
        ],
        hooks: [
          {
            name: 'rewriter',
            beforeToolCall: (ctx) => ctx.rewriteToolCall({ name: 'send' }),
          },
        ],
      }),
    );

    expect(executeSend).not.toHaveBeenCalled();
  });
});
