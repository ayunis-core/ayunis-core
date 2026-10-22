import { describe, expect, it, vi } from 'vitest';

import type { ModelCallOutcomeSnapshot } from '../contracts/hook';
import type { ProviderChunk } from '../contracts/provider';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool } from './test-helpers';

const usage = {
  inputTokens: 2,
  cacheReadInputTokens: 39915,
  outputTokens: 32000,
};

async function complete(chunks: ProviderChunk[]) {
  const outcomes: ModelCallOutcomeSnapshot[] = [];
  const model = new MockProvider([chunks, textTurn('Unexpected replay')]);
  const events = await collectEvents(
    baseInput(model, {
      hooks: [
        {
          name: 'account',
          afterModelCall: async (ctx) => {
            outcomes.push(ctx.outcome);
          },
        },
      ],
    }),
  );
  return { model, events, outcomes };
}

describe('terminal provider completions', () => {
  it.each([
    { content: [] },
    { content: [{ thinkingSignature: 'opaque-signature' }] },
    { content: [{ thinkingDelta: 'Working through the request' }] },
  ])(
    'does not replay output exhaustion without an answer (%j)',
    async ({ content }) => {
      const { model, events, outcomes } = await complete([
        ...content,
        { finishReason: 'length', usage },
      ]);
      expect(model.requests).toHaveLength(1);
      expect(outcomes).toMatchObject([
        {
          type: 'rejected',
          reason: 'output_limit',
          usage,
          finishReason: 'length',
        },
      ]);
      expect(events.at(-1)).toMatchObject({
        type: 'run_end',
        status: 'error',
        usage,
      });
    },
  );

  it.each(['refusal', 'pause_turn'] as const)(
    'does not replay a %s or execute its partial tool call',
    async (finishReason) => {
      const execute = vi.fn(() => 'Should not execute');
      const outcomes: ModelCallOutcomeSnapshot[] = [];
      const model = new MockProvider([
        [
          ...toolCallTurn({
            id: 'restricted-call',
            name: 'echo',
            input: { value: 'restricted' },
          }),
          { finishReason, usage },
        ],
        textTurn('Unexpected replay'),
      ]);
      const events = await collectEvents(
        baseInput(model, {
          tools: [echoTool({ execute })],
          hooks: [
            {
              name: 'account',
              afterModelCall: async (ctx) => {
                outcomes.push(ctx.outcome);
              },
            },
          ],
        }),
      );
      expect(model.requests).toHaveLength(1);
      expect(execute).not.toHaveBeenCalled();
      expect(outcomes).toMatchObject([
        { type: 'rejected', reason: finishReason, finishReason, usage },
      ]);
      expect(events.at(-1)).toMatchObject({
        type: 'run_end',
        status: 'error',
        usage,
      });
    },
  );

  it('never replays an already completed tool after an output-limit failure', async () => {
    const execute = vi.fn(() => 'Already completed');
    const model = new MockProvider([
      toolCallTurn({
        id: 'completed-call',
        name: 'echo',
        input: { value: '42' },
      }),
      [{ finishReason: 'length', usage }],
      textTurn('Unexpected replay'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool({ execute })] }),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(model.requests).toHaveLength(2);
    expect(
      events.filter((event) => event.type === 'tool_result_message'),
    ).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('reports the terminal output limit after an earlier malformed attempt', async () => {
    const model = new MockProvider([
      [
        {
          toolCallDeltas: [
            {
              index: 0,
              id: 'incomplete-call',
              name: 'echo',
              argumentsDelta: '{',
            },
          ],
        },
      ],
      [{ finishReason: 'length', usage }],
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()] }),
    );
    expect(model.requests).toHaveLength(2);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_FAILED',
      message:
        'Model provider exhausted the output token limit without an answer',
    });
  });

  it.each(['refusal', 'pause_turn'] as const)(
    'invalidates visible tool snapshots after %s',
    async (finishReason) => {
      const { events } = await complete([
        { textDelta: 'The operation cannot continue.' },
        {
          toolCallDeltas: [
            {
              index: 7,
              id: 'not-executed',
              name: 'echo',
              argumentsDelta: '{"value":"42"}',
            },
          ],
        },
        { finishReason, usage },
      ]);
      const snapshots = events.filter(
        (event) => event.type === 'tool_call_snapshot',
      );
      expect(snapshots.at(-1)).toMatchObject({
        toolCall: {
          index: 7,
          id: 'not-executed',
          name: 'echo',
          argumentsJson: '{"value":"42"}',
          input: { value: '42' },
          status: 'invalid',
        },
      });
      expect(events.some((event) => event.type === 'tool_call')).toBe(false);
    },
  );

  it('keeps ordinary empty completion recovery', async () => {
    const { model, events } = await complete([{ finishReason: 'stop', usage }]);
    expect(model.requests).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('keeps deliverable text when the output budget is reached', async () => {
    const { model, events } = await complete([
      { textDelta: 'Useful partial answer' },
      { finishReason: 'length', usage },
    ]);
    expect(model.requests).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });
});
