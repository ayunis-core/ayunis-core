import { run } from '@ayunis/agent-runtime';
import type { ModelCallOutcomeSnapshot } from '@ayunis/agent-runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bedrock } from './bedrock-provider';
import { asApiPromise, events } from './test-helpers';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@anthropic-ai/bedrock-sdk', () => ({
  default: class {
    messages = {
      create: (...args: unknown[]) => asApiPromise(create(...args)),
    };
  },
}));

beforeEach(() => create.mockReset());

describe('Bedrock SSE terminal completions through the runtime', () => {
  it.each([
    {
      stopReason: 'max_tokens',
      outputTokens: 32000,
      signature: false,
      reason: 'output_limit',
      finishReason: 'length',
    },
    {
      stopReason: 'max_tokens',
      outputTokens: 32000,
      signature: true,
      reason: 'output_limit',
      finishReason: 'length',
    },
    {
      stopReason: 'refusal',
      outputTokens: 158,
      signature: false,
      reason: 'refusal',
      finishReason: 'refusal',
    },
    {
      stopReason: 'refusal',
      outputTokens: 0,
      signature: false,
      reason: 'refusal',
      finishReason: 'refusal',
    },
    {
      stopReason: 'pause_turn',
      outputTokens: 106,
      signature: true,
      reason: 'pause_turn',
      finishReason: 'pause_turn',
    },
  ])(
    'finalizes one call for $stopReason ($outputTokens tokens, signature=$signature)',
    async ({ stopReason, outputTokens, signature, reason, finishReason }) => {
      create.mockImplementation(() =>
        events(
          {
            type: 'message_start',
            message: {
              usage: { input_tokens: 2, cache_read_input_tokens: 39915 },
            },
          },
          {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'thinking', thinking: '' },
          },
          { type: 'ping' },
          ...(signature
            ? [
                {
                  type: 'content_block_delta',
                  index: 0,
                  delta: {
                    type: 'signature_delta',
                    signature: 'opaque-signature',
                  },
                },
              ]
            : []),
          { type: 'content_block_stop', index: 0 },
          {
            type: 'message_delta',
            delta: { stop_reason: stopReason },
            usage: { output_tokens: outputTokens },
          },
          { type: 'message_stop' },
        ),
      );
      const outcomes: ModelCallOutcomeSnapshot[] = [];
      const emitted = [];
      for await (const event of run({
        model: bedrock({
          model: 'eu.anthropic.claude-opus-5-5',
          maxTokens: 32000,
          maxRetries: 0,
        }),
        instructions: 'Answer the user.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Summarize the findings.' }],
          },
        ],
        hooks: [
          {
            name: 'account',
            afterModelCall: async (ctx) => {
              outcomes.push(ctx.outcome);
            },
          },
        ],
      }))
        emitted.push(event);
      const usage = {
        inputTokens: 2,
        cacheReadInputTokens: 39915,
        outputTokens,
      };
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 32000, stream: true }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]).toMatchObject({
        type: 'rejected',
        reason,
        finishReason,
        usage,
        producedOutput: false,
        visibleOutput: false,
      });
      expect(emitted.at(-1)).toMatchObject({
        type: 'run_end',
        status: 'error',
        usage,
      });
      expect(emitted.some((event) => event.type === 'assistant_message')).toBe(
        false,
      );
    },
  );
});
