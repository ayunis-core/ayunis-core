import type { Message } from '@ayunis/inference';
import { ToolNameCodec } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import {
  convertMessages as convertMessagesFn,
  convertSystem,
  convertTool as convertToolFn,
  convertToolChoice as convertToolChoiceFn,
  markCacheBreakpoint,
} from './convert-request';

// Passthrough map — name translation is covered by its own tests below.
const passthrough = new ToolNameCodec([]);
const convertMessages = (messages: Message[]) =>
  convertMessagesFn(messages, passthrough);
const convertTool = (tool: Parameters<typeof convertToolFn>[0]) =>
  convertToolFn(tool, passthrough);
const convertToolChoice = (choice: Parameters<typeof convertToolChoiceFn>[0]) =>
  convertToolChoiceFn(choice, passthrough);

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

  it('normalizes MCP-style schemas that Anthropic would reject', () => {
    expect(
      convertTool({
        name: 'search',
        description: 'Searches',
        parameters: { properties: { q: { type: 'string' } } },
      }),
    ).toEqual({
      name: 'search',
      description: 'Searches',
      input_schema: { type: 'object', properties: { q: { type: 'string' } } },
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

  it('maps image content to a base64 image block', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', data: 'aGVsbG8=', mediaType: 'image/png' },
        ],
      },
    ];

    expect(convertMessages(messages)[0].content).toEqual([
      { type: 'text', text: 'What is this?' },
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' },
      },
    ]);
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

  it('throws when a non-empty history reduces to no messages', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'unsigned', id: null, signature: null },
        ],
      },
    ];

    expect(() => convertMessages(messages)).toThrow(
      'all messages converted to empty content',
    );
  });

  it('returns an empty array for an empty history', () => {
    expect(convertMessages([])).toEqual([]);
  });
});

describe('convertSystem', () => {
  it('wraps non-empty instructions in a cached text block', () => {
    expect(convertSystem('You are helpful.')).toEqual([
      {
        type: 'text',
        text: 'You are helpful.',
        cache_control: { type: 'ephemeral' },
      },
    ]);
  });

  it('returns empty instructions unchanged — nothing to cache', () => {
    expect(convertSystem('')).toBe('');
  });
});

describe('markCacheBreakpoint', () => {
  it('marks the last content block of the last message', () => {
    const marked = markCacheBreakpoint([
      { role: 'user', content: [{ type: 'text', text: 'first' }] },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
        ],
      },
    ]);
    expect(marked).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'first' }] },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b', cache_control: { type: 'ephemeral' } },
        ],
      },
    ]);
  });

  it('skips thinking blocks — they cannot carry cache_control', () => {
    const marked = markCacheBreakpoint([
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'answer' },
          { type: 'thinking', thinking: 'hmm', signature: 'sig' },
        ],
      },
    ]);
    expect(marked).toEqual([
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'answer',
            cache_control: { type: 'ephemeral' },
          },
          { type: 'thinking', thinking: 'hmm', signature: 'sig' },
        ],
      },
    ]);
  });

  it('leaves messages unmarked when no block can carry cache_control', () => {
    const marked = markCacheBreakpoint([
      {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'hmm', signature: 'sig' }],
      },
    ]);
    expect(marked).toEqual([
      {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'hmm', signature: 'sig' }],
      },
    ]);
  });

  it('returns an empty message list unchanged', () => {
    expect(markCacheBreakpoint([])).toEqual([]);
  });
});

describe('wire-name encoding', () => {
  const codec = new ToolNameCodec([
    { name: 'notion.search', description: 'd', parameters: {} },
  ]);

  it('declares tools under their wire names', () => {
    expect(
      convertToolFn(
        {
          name: 'notion.search',
          description: 'd',
          parameters: { type: 'object' },
        },
        codec,
      ).name,
    ).toBe('notion_search');
  });

  it('translates tool_use names in assistant history', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'toolu_1', name: 'notion.search', input: {} },
        ],
      },
    ];
    const [assistant] = convertMessagesFn(messages, codec);
    expect(assistant.content).toEqual([
      { type: 'tool_use', id: 'toolu_1', name: 'notion_search', input: {} },
    ]);
  });

  it('translates a specific tool choice', () => {
    expect(convertToolChoiceFn({ tool: 'notion.search' }, codec)).toEqual({
      type: 'tool',
      name: 'notion_search',
    });
  });
});
