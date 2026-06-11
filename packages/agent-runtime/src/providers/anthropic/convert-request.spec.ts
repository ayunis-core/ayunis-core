import { describe, expect, it } from 'vitest';

import type { Message } from '../../contracts/message';
import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

describe('convertTool', () => {
  it('maps the schema to Anthropic input_schema', () => {
    expect(
      convertTool({
        name: 'search',
        description: 'Searches',
        parameters: { type: 'object', properties: {} },
      }),
    ).toEqual({
      name: 'search',
      description: 'Searches',
      input_schema: { type: 'object', properties: {} },
    });
  });
});

describe('convertToolChoice', () => {
  it('maps auto, required, and specific tool', () => {
    expect(convertToolChoice('auto')).toEqual({ type: 'auto' });
    expect(convertToolChoice('required')).toEqual({ type: 'any' });
    expect(convertToolChoice({ tool: 'search' })).toEqual({
      type: 'tool',
      name: 'search',
    });
  });
});

describe('convertMessages', () => {
  it('converts a user/assistant/tool_result conversation', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Find agents' }] },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Searching.' },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'search',
            input: { q: 'agents' },
          },
        ],
      },
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'toolu_1',
            toolName: 'search',
            result: '3 results',
          },
        ],
      },
    ];

    expect(convertMessages(messages)).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'Find agents' }] },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Searching.' },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'search',
            input: { q: 'agents' },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: '3 results',
          },
        ],
      },
    ]);
  });

  it('merges consecutive non-assistant messages into one user turn', () => {
    const messages: Message[] = [
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'toolu_1',
            toolName: 'search',
            result: 'ok',
          },
        ],
      },
      { role: 'user', content: [{ type: 'text', text: 'Continue' }] },
    ];

    const converted = convertMessages(messages);
    expect(converted).toHaveLength(1);
    expect(converted[0].role).toBe('user');
    expect(converted[0].content).toHaveLength(2);
  });

  it('marks errored tool results with is_error', () => {
    const messages: Message[] = [
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'toolu_1',
            toolName: 'search',
            result: 'not found',
            isError: true,
          },
        ],
      },
    ];

    expect(convertMessages(messages)[0].content).toEqual([
      {
        type: 'tool_result',
        tool_use_id: 'toolu_1',
        content: 'not found',
        is_error: true,
      },
    ]);
  });

  it('drops assistant turns whose content converts to nothing', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'unsigned', id: null, signature: null },
        ],
      },
      { role: 'user', content: [{ type: 'text', text: 'Still there?' }] },
    ];

    const converted = convertMessages(messages);
    expect(converted).toHaveLength(1);
    expect(converted[0].role).toBe('user');
    expect(converted[0].content).toHaveLength(2);
  });

  it('replays signed thinking blocks and drops unsigned ones', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'unsigned', id: null, signature: null },
          {
            type: 'thinking',
            thinking: 'signed',
            id: null,
            signature: 'sig-1',
          },
          { type: 'text', text: 'Answer' },
        ],
      },
    ];

    expect(convertMessages(messages)[0].content).toEqual([
      { type: 'thinking', thinking: 'signed', signature: 'sig-1' },
      { type: 'text', text: 'Answer' },
    ]);
  });
});
