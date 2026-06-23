import { describe, expect, it } from 'vitest';

import type { Message, ToolSchema } from '@ayunis/inference';

import { convertMessages, convertTool } from './convert-request';

describe('convertTool', () => {
  it('maps a tool schema to an Ollama function tool with strict mode', () => {
    const tool: ToolSchema = {
      name: 'get_weather',
      description: 'Get the weather',
      parameters: { type: 'object', properties: { city: { type: 'string' } } },
    };
    const converted = convertTool(tool);
    expect(converted.type).toBe('function');
    expect(converted.function.name).toBe('get_weather');
    expect(converted.function.description).toBe('Get the weather');
    expect((converted.function as { strict?: boolean }).strict).toBe(true);
  });
});

describe('convertMessages', () => {
  it('prepends instructions as a leading system message', () => {
    const result = convertMessages('You are helpful', [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ]);
    expect(result[0]).toEqual({ role: 'system', content: 'You are helpful' });
    expect(result[1]).toMatchObject({ role: 'user', content: 'Hi' });
  });

  it('omits the system message when instructions are empty', () => {
    const result = convertMessages('', [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
  });

  it('emits resolved images as base64 strings on the user turn', () => {
    const result = convertMessages('', [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', data: 'BASE64DATA', mediaType: 'image/png' },
        ],
      },
    ]);
    expect(result[0]).toMatchObject({
      role: 'user',
      content: 'What is this?',
      images: ['BASE64DATA'],
    });
  });

  it('maps assistant thinking and tool calls', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'hmm' },
          { type: 'text', text: 'Calling tool' },
          {
            type: 'tool_use',
            id: 'call_1',
            name: 'get_weather',
            input: { city: 'Berlin' },
          },
        ],
      },
    ];
    const result = convertMessages('', messages);
    expect(result[0]).toMatchObject({
      role: 'assistant',
      content: 'Calling tool',
      thinking: 'hmm',
      tool_calls: [
        { function: { name: 'get_weather', arguments: { city: 'Berlin' } } },
      ],
    });
  });

  it('maps each tool_result to its own tool message', () => {
    const messages: Message[] = [
      {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_1',
            toolName: 'get_weather',
            result: 'sunny',
          },
        ],
      },
    ];
    const result = convertMessages('', messages);
    expect(result).toEqual([{ role: 'tool', content: 'sunny' }]);
  });

  it('drops user turns with neither text nor images', () => {
    const result = convertMessages('', [{ role: 'user', content: [] }]);
    expect(result).toHaveLength(0);
  });
});
