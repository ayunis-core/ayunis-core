import { run } from '@ayunis/agent-runtime';
import { describe, expect, it } from 'vitest';

import { anthropic } from './anthropic-provider';

const apiKey = process.env.ANTHROPIC_API_KEY;

/**
 * Live smoke against the real Anthropic API. Skipped unless
 * ANTHROPIC_API_KEY is set; excluded from CI by default. This is also the
 * canonical host-composition example: a resolved provider handed to run().
 */
describe.skipIf(!apiKey)('anthropic provider (live)', () => {
  it('streams a tool-use run end to end', async () => {
    const model = anthropic({
      apiKey: apiKey ?? '',
      model: 'claude-haiku-4-5',
      maxTokens: 1024,
    });
    const types: string[] = [];
    let answer = '';
    for await (const event of run({
      instructions:
        'Use the get_number tool, then answer with the number it returns.',
      model,
      tools: [
        {
          name: 'get_number',
          description: 'Returns a secret number',
          parameters: { type: 'object', properties: {} },
          execute: () => 'The number is 7274.',
        },
      ],
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is the number?' }],
        },
      ],
    })) {
      types.push(event.type);
      if (event.type === 'text_delta') {
        answer += event.delta;
      }
    }

    expect(types).toContain('tool_call');
    expect(types).toContain('tool_result');
    expect(types.at(-1)).toBe('run_end');
    expect(answer).toContain('7274');
  }, 60_000);
});
