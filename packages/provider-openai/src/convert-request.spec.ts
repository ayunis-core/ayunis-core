import type { Message } from '@ayunis/inference';
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
const convertTool = (tool: Parameters<typeof convertToolFn>[0]) =>
  convertToolFn(tool, passthrough);
const convertToolChoice = (choice: Parameters<typeof convertToolChoiceFn>[0]) =>
  convertToolChoiceFn(choice, passthrough);

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

  it('preserves free-form object maps by using non-strict mode', () => {
    const parameters = {
      type: 'object',
      properties: {
        properties: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['properties'],
      additionalProperties: false,
    };

    const tool = convertTool({
      name: 'hubspot-batch-create-objects',
      description: 'Creates HubSpot objects',
      parameters,
    });

    expect(tool.function.parameters).toEqual(parameters);
    expect(tool.function.strict).toBe(false);
  });

  it('uses non-strict mode for unconstrained values and arrays', () => {
    const parameters = {
      type: 'object',
      properties: {
        value: { description: 'Any filter value' },
        values: { type: 'array' },
      },
      additionalProperties: false,
    };

    const tool = convertTool({
      name: 'hubspot-search-objects',
      description: 'Searches HubSpot objects',
      parameters,
    });

    expect(tool.function.parameters).toEqual(parameters);
    expect(tool.function.strict).toBe(false);
  });

  it('preserves propertyNames maps by using non-strict mode', () => {
    const parameters = {
      type: 'object',
      properties: {
        anchor: {
          type: 'object',
          propertyNames: { type: 'string' },
          additionalProperties: {},
        },
      },
      additionalProperties: false,
    };

    const tool = convertTool({
      name: 'save_diff_comment',
      description: 'Saves a diff comment',
      parameters,
    });

    expect(tool.function.parameters).toEqual(parameters);
    expect(tool.function.strict).toBe(false);
  });

  it('keeps tuple arrays in strict mode after normalization', () => {
    const tool = convertTool({
      name: 'tuple-tool',
      description: 'Accepts a tuple',
      parameters: {
        type: 'object',
        properties: {
          values: {
            type: 'array',
            items: [{ type: 'string' }, { type: 'number' }],
          },
        },
      },
    });

    expect(tool.function.parameters).toMatchObject({
      properties: {
        values: {
          items: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        },
      },
    });
    expect(tool.function.strict).toBe(true);
  });

  it('normalizes tuple arrays without closing maps in non-strict mode', () => {
    const tool = convertTool({
      name: 'mixed-schema-tool',
      description: 'Accepts a map and a tuple',
      parameters: {
        type: 'object',
        properties: {
          metadata: { type: 'object', additionalProperties: true },
          values: {
            type: 'array',
            items: [{ type: 'string' }, { type: 'number' }],
          },
        },
      },
    });

    expect(tool.function.parameters).toEqual({
      type: 'object',
      properties: {
        metadata: { type: 'object', additionalProperties: true },
        values: {
          type: 'array',
          items: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        },
      },
    });
    expect(tool.function.strict).toBe(false);
  });

  it('uses non-strict mode for allOf schemas', () => {
    const parameters = {
      type: 'object',
      properties: {
        values: {
          type: 'array',
          items: { allOf: [{ type: 'string' }] },
        },
      },
    };

    const tool = convertTool({
      name: 'all-of-tool',
      description: 'Accepts an intersected value',
      parameters,
    });

    expect(tool.function.parameters).toEqual(parameters);
    expect(tool.function.strict).toBe(false);
  });

  it('uses non-strict mode for unsupported conditional keywords', () => {
    const parameters = {
      type: 'object',
      properties: { value: { type: 'string' } },
      if: { properties: { value: { const: 'special' } } },
      then: { required: ['value'] },
    };

    const tool = convertTool({
      name: 'conditional-tool',
      description: 'Accepts conditional input',
      parameters,
    });

    expect(tool.function.parameters).toEqual(parameters);
    expect(tool.function.strict).toBe(false);
  });

  it('uses non-strict mode for boolean property schemas', () => {
    const parameters = {
      type: 'object',
      properties: { value: true },
    };

    const tool = convertTool({
      name: 'boolean-schema-tool',
      description: 'Accepts any value',
      parameters,
    });

    expect(tool.function.parameters).toEqual(parameters);
    expect(tool.function.strict).toBe(false);
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

  it('emits an array of content parts when a user turn has an image', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', data: 'aGVsbG8=', mediaType: 'image/png' },
        ],
      },
    ];

    expect(convertMessages('', messages)).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,aGVsbG8=' },
          },
        ],
      },
    ]);
  });

  it('keeps a plain string for text-only user turns', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ];
    expect(convertMessages('', messages)).toEqual([
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('preserves the order of image and text parts', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'image', data: 'aGVsbG8=', mediaType: 'image/png' },
          { type: 'text', text: 'Describe this' },
        ],
      },
    ];

    expect(convertMessages('', messages)).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,aGVsbG8=' },
          },
          { type: 'text', text: 'Describe this' },
        ],
      },
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
    const converted = convertMessagesFn('', messages, codec);
    expect(converted[0]).toMatchObject({
      role: 'assistant',
      tool_calls: [
        { id: 'call_1', function: { name: 'notion_search', arguments: '{}' } },
      ],
    });
  });

  it('translates a specific tool choice', () => {
    expect(convertToolChoiceFn({ tool: 'notion.search' }, codec)).toEqual({
      type: 'function',
      function: { name: 'notion_search' },
    });
  });
});
