import type { Message, ToolSchema } from '@ayunis/inference';
import { ToolNameCodec } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import {
  convertMessages as convertMessagesFn,
  convertTool as convertToolFn,
  convertToolChoice as convertToolChoiceFn,
} from './convert-request';

// Passthrough map — name translation is covered by its own tests below.
const passthrough = new ToolNameCodec([]);
const convertMessages = (instructions: string, messages: Message[]) =>
  convertMessagesFn(instructions, messages, passthrough);
const convertTool = (tool: ToolSchema) => convertToolFn(tool, passthrough);
const convertToolChoice = (choice: Parameters<typeof convertToolChoiceFn>[0]) =>
  convertToolChoiceFn(choice, passthrough);

describe('convertTool', () => {
  it('wraps a tool schema as a Mistral function tool', () => {
    const tool: ToolSchema = {
      name: 'search',
      description: 'Search the web',
      parameters: { type: 'object', properties: {} },
    };
    expect(convertTool(tool)).toEqual({
      type: 'function',
      function: {
        name: 'search',
        description: 'Search the web',
        parameters: { type: 'object', properties: {} },
      },
    });
  });

  it('converts draft-04 exclusive bounds Mistral would reject', () => {
    const tool: ToolSchema = {
      name: 'paginate',
      description: 'Paginate',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 0, exclusiveMinimum: true },
        },
      },
    };
    expect(convertTool(tool).function.parameters).toEqual({
      type: 'object',
      properties: { page: { type: 'integer', exclusiveMinimum: 0 } },
    });
  });
});

describe('convertToolChoice', () => {
  it('passes through auto and required', () => {
    expect(convertToolChoice('auto')).toBe('auto');
    expect(convertToolChoice('required')).toBe('required');
  });

  it('maps a named tool to a function tool choice', () => {
    expect(convertToolChoice({ tool: 'search' })).toEqual({
      type: 'function',
      function: { name: 'search' },
    });
  });
});

describe('convertMessages', () => {
  it('prepends instructions as a leading system message', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ];
    expect(convertMessages('Be helpful', messages)).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('omits the leading system message when instructions are empty', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ];
    expect(convertMessages('', messages)).toEqual([
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('maps a user turn with an image to ordered content chunks', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look:' },
          { type: 'image', data: 'AAAA', mediaType: 'image/png' },
        ],
      },
    ];
    expect(convertMessages('', messages)).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look:' },
          {
            type: 'image_url',
            imageUrl: { url: 'data:image/png;base64,AAAA' },
          },
        ],
      },
    ]);
  });

  it('maps an assistant turn with text and tool calls', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Calling' },
          { type: 'tool_use', id: 't1', name: 'search', input: { q: 'x' } },
        ],
      },
    ];
    expect(convertMessages('', messages)).toEqual([
      {
        role: 'assistant',
        content: 'Calling',
        toolCalls: [
          {
            id: 't1',
            type: 'function',
            function: { name: 'search', arguments: '{"q":"x"}' },
          },
        ],
      },
    ]);
  });

  it('drops an assistant turn that has only thinking content', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'hmm' }],
      },
    ];
    expect(convertMessages('', messages)).toEqual([]);
  });

  it('maps each tool result to its own tool message', () => {
    const messages: Message[] = [
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 't1',
            toolName: 'search',
            result: 'ok',
          },
          {
            type: 'tool_result',
            toolCallId: 't2',
            toolName: 'search',
            result: 'boom',
            isError: true,
          },
        ],
      },
    ];
    expect(convertMessages('', messages)).toEqual([
      { role: 'tool', toolCallId: 't1', content: 'ok' },
      { role: 'tool', toolCallId: 't2', content: 'Error: boom' },
    ]);
  });

  it('maps an in-thread system message', () => {
    const messages: Message[] = [
      { role: 'system', content: [{ type: 'text', text: 'Context' }] },
    ];
    expect(convertMessages('', messages)).toEqual([
      { role: 'system', content: 'Context' },
    ]);
  });
});

describe('wire-name encoding', () => {
  const codec = new ToolNameCodec([
    { name: 'notion.search', description: 'd', parameters: {} },
  ]);

  it('declares tools under their wire names', () => {
    expect(
      convertToolFn(
        { name: 'notion.search', description: 'd', parameters: {} },
        codec,
      ).function.name,
    ).toBe('notion_search');
  });

  it('translates tool_call names in assistant history', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'call_1', name: 'notion.search', input: {} },
        ],
      },
    ];
    const [assistant] = convertMessagesFn('', messages, codec);
    expect(assistant).toMatchObject({
      role: 'assistant',
      toolCalls: [{ id: 'call_1', function: { name: 'notion_search' } }],
    });
  });

  it('translates a specific tool choice', () => {
    expect(convertToolChoiceFn({ tool: 'notion.search' }, codec)).toEqual({
      type: 'function',
      function: { name: 'notion_search' },
    });
  });
});
