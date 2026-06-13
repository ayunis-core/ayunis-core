import type { Message } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

describe('convertTool', () => {
  it('maps the schema to a strict OpenAI function tool', () => {
    expect(
      convertTool({
        name: 'search',
        description: 'Searches',
        parameters: { type: 'object', properties: {} },
      }),
    ).toEqual({
      type: 'function',
      function: {
        name: 'search',
        description: 'Searches',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
          required: [],
        },
        strict: true,
      },
    });
  });

  it('strips unsupported JSON schema format values', () => {
    const tool = convertTool({
      name: 'fetch',
      description: 'Fetches a URL',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', format: 'uri' } },
      },
    });
    const params = tool.function.parameters as {
      properties: { url: { format?: string } };
      required: string[];
    };
    expect(params.properties.url.format).toBeUndefined();
    expect(params.required).toEqual(['url']);
    expect(tool.function.strict).toBe(true);
  });
});

describe('convertToolChoice', () => {
  it('maps auto, required, and specific tool', () => {
    expect(convertToolChoice('auto')).toBe('auto');
    expect(convertToolChoice('required')).toBe('required');
    expect(convertToolChoice({ tool: 'search' })).toEqual({
      type: 'function',
      function: { name: 'search' },
    });
  });
});

describe('convertMessages', () => {
  it('prepends instructions as a system message', () => {
    const result = convertMessages('Be helpful', [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ]);
    expect(result).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('omits the system message when instructions are empty', () => {
    const result = convertMessages('', [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ]);
    expect(result).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  it('maps an in-thread system message to a system message', () => {
    const result = convertMessages('', [
      { role: 'system', content: [{ type: 'text', text: 'Stay terse' }] },
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ]);
    expect(result).toEqual([
      { role: 'system', content: 'Stay terse' },
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('maps assistant tool_use to tool_calls with stringified arguments', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Searching.' },
          {
            type: 'tool_use',
            id: 'call_1',
            name: 'search',
            input: { q: 'agents' },
          },
        ],
      },
    ];

    expect(convertMessages('', messages)).toEqual([
      {
        role: 'assistant',
        content: 'Searching.',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'search', arguments: '{"q":"agents"}' },
          },
        ],
      },
    ]);
  });

  it('uses null content for an assistant turn that only calls a tool', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'call_1',
            name: 'search',
            input: {},
          },
        ],
      },
    ];

    const result = convertMessages('', messages);
    expect(result[0]).toMatchObject({ role: 'assistant', content: null });
  });

  it('emits one tool message per tool_result', () => {
    const messages: Message[] = [
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_1',
            toolName: 'search',
            result: '3 results',
          },
          {
            type: 'tool_result',
            toolCallId: 'call_2',
            toolName: 'lookup',
            result: 'ok',
          },
        ],
      },
    ];

    expect(convertMessages('', messages)).toEqual([
      { role: 'tool', tool_call_id: 'call_1', content: '3 results' },
      { role: 'tool', tool_call_id: 'call_2', content: 'ok' },
    ]);
  });

  it('skips an assistant turn with neither text nor tool calls', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'secret', id: null, signature: 's' },
        ],
      },
      { role: 'user', content: [{ type: 'text', text: 'Still there?' }] },
    ];

    expect(convertMessages('', messages)).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'user', content: 'Still there?' },
    ]);
  });

  it('marks errored tool results in the content', () => {
    const messages: Message[] = [
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_1',
            toolName: 'search',
            result: 'boom',
            isError: true,
          },
        ],
      },
    ];

    expect(convertMessages('', messages)).toEqual([
      { role: 'tool', tool_call_id: 'call_1', content: 'Error: boom' },
    ]);
  });

  it('drops thinking content', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'secret', id: null, signature: 's' },
          { type: 'text', text: 'Answer' },
        ],
      },
    ];

    expect(convertMessages('', messages)).toEqual([
      { role: 'assistant', content: 'Answer' },
    ]);
  });
});
