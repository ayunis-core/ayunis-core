import type { Message } from '@ayunis/inference';
import { ToolNameCodec } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import {
  convertResponseInput,
  convertResponseTool,
  convertResponseToolChoice,
} from './convert-response-request';

const passthrough = new ToolNameCodec([]);

describe('convertResponseTool', () => {
  it('maps function tools to the Responses API shape', () => {
    expect(
      convertResponseTool(
        {
          name: 'search',
          description: 'Search municipal documents',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
          },
        },
        passthrough,
      ),
    ).toEqual({
      type: 'function',
      name: 'search',
      description: 'Search municipal documents',
      parameters: {
        type: 'object',
        properties: { query: { type: ['string', 'null'] } },
        additionalProperties: false,
        required: ['query'],
      },
      strict: true,
    });
  });

  it('uses non-strict mode for free-form object maps', () => {
    const parameters = {
      type: 'object',
      properties: {
        filters: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    };

    expect(
      convertResponseTool(
        {
          name: 'search-with-filters',
          description: 'Search with arbitrary filters',
          parameters,
        },
        passthrough,
      ),
    ).toMatchObject({ parameters, strict: false });
  });
});

describe('convertResponseToolChoice', () => {
  it('maps automatic, required, and named choices', () => {
    expect(convertResponseToolChoice('auto', passthrough)).toBe('auto');
    expect(convertResponseToolChoice('required', passthrough)).toBe('required');
    expect(convertResponseToolChoice({ tool: 'search' }, passthrough)).toEqual({
      type: 'function',
      name: 'search',
    });
  });
});

describe('convertResponseInput', () => {
  it('maps conversation history, tool calls, and tool results', () => {
    const messages: Message[] = [
      {
        role: 'system',
        content: [{ type: 'text', text: 'Only cite official sources.' }],
      },
      {
        role: 'user',
        content: [{ type: 'text', text: 'Find the retention policy.' }],
      },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will search.' },
          {
            type: 'tool_use',
            id: 'call_123',
            name: 'search',
            input: { query: 'retention policy' },
          },
        ],
      },
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_123',
            toolName: 'search',
            result: 'Responses are retained for 30 days by default.',
          },
        ],
      },
    ];

    expect(convertResponseInput(messages, passthrough)).toEqual([
      { role: 'system', content: 'Only cite official sources.' },
      { role: 'user', content: 'Find the retention policy.' },
      { role: 'assistant', content: 'I will search.' },
      {
        type: 'function_call',
        call_id: 'call_123',
        name: 'search',
        arguments: '{"query":"retention policy"}',
      },
      {
        type: 'function_call_output',
        call_id: 'call_123',
        output: 'Responses are retained for 30 days by default.',
      },
    ]);
  });

  it('preserves image and text order in user messages', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'image', data: 'aGVsbG8=', mediaType: 'image/png' },
          { type: 'text', text: 'Describe this image.' },
        ],
      },
    ];

    expect(convertResponseInput(messages, passthrough)).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'input_image',
            detail: 'auto',
            image_url: 'data:image/png;base64,aGVsbG8=',
          },
          { type: 'input_text', text: 'Describe this image.' },
        ],
      },
    ]);
  });

  it('drops thinking-only turns and marks tool errors', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'private reasoning' }],
      },
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_456',
            toolName: 'search',
            result: 'Service unavailable',
            isError: true,
          },
        ],
      },
    ];

    expect(convertResponseInput(messages, passthrough)).toEqual([
      {
        type: 'function_call_output',
        call_id: 'call_456',
        output: 'Error: Service unavailable',
      },
    ]);
  });

  it('replays encrypted reasoning before its function call', () => {
    const reasoning = {
      id: 'rs_123',
      type: 'reasoning',
      summary: [],
      encrypted_content: 'encrypted-state',
      status: 'completed',
    };
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'call_123',
            name: 'search',
            input: { query: 'retention policy' },
            providerMetadata: { openaiReasoning: [reasoning] },
          },
        ],
      },
    ];

    expect(convertResponseInput(messages, passthrough)).toEqual([
      reasoning,
      {
        type: 'function_call',
        call_id: 'call_123',
        name: 'search',
        arguments: '{"query":"retention policy"}',
      },
    ]);
  });

  it('replays encrypted reasoning before text from a completed turn', () => {
    const reasoning = {
      id: 'rs_123',
      type: 'reasoning',
      summary: [],
      encrypted_content: 'encrypted-state',
      status: 'completed',
    };
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'The answer is 42.',
            providerMetadata: { openaiReasoning: [reasoning] },
          },
        ],
      },
    ];

    expect(convertResponseInput(messages, passthrough)).toEqual([
      reasoning,
      { role: 'assistant', content: 'The answer is 42.' },
    ]);
  });

  it('encodes provider-incompatible tool names in replayed calls', () => {
    const codec = new ToolNameCodec([
      { name: 'notion.search', description: 'Search Notion', parameters: {} },
    ]);
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'call_789',
            name: 'notion.search',
            input: {},
          },
        ],
      },
    ];

    expect(convertResponseInput(messages, codec)).toEqual([
      {
        type: 'function_call',
        call_id: 'call_789',
        name: 'notion_search',
        arguments: '{}',
      },
    ]);
  });
});
