import type { Message, ToolSchema } from '@ayunis/inference';
import { FunctionCallingConfigMode } from '@google/genai';
import { describe, expect, it } from 'vitest';

import {
  buildConfig,
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

describe('convertTool', () => {
  it('maps a tool schema to a Gemini function declaration', () => {
    const tool: ToolSchema = {
      name: 'search',
      description: 'Search the web',
      parameters: { type: 'object', properties: {} },
    };
    expect(convertTool(tool)).toEqual({
      name: 'search',
      description: 'Search the web',
      parameters: { type: 'object', properties: {} },
    });
  });
});

describe('convertToolChoice', () => {
  it('maps auto and required', () => {
    expect(convertToolChoice('auto')).toEqual({
      mode: FunctionCallingConfigMode.AUTO,
    });
    expect(convertToolChoice('required')).toEqual({
      mode: FunctionCallingConfigMode.ANY,
    });
  });

  it('maps a named tool to ANY with an allowed-function-names list', () => {
    expect(convertToolChoice({ tool: 'search' })).toEqual({
      mode: FunctionCallingConfigMode.ANY,
      allowedFunctionNames: ['search'],
    });
  });
});

describe('buildConfig', () => {
  const tool: ToolSchema = {
    name: 'search',
    description: 'Search the web',
    parameters: { type: 'object', properties: {} },
  };

  it('maps instructions to a user-role system instruction', () => {
    const config = buildConfig({ instructions: 'Be helpful', tools: [] });
    expect(config.systemInstruction).toEqual({
      role: 'user',
      parts: [{ text: 'Be helpful' }],
    });
  });

  it('omits the system instruction when instructions are empty', () => {
    const config = buildConfig({ instructions: '', tools: [] });
    expect(config.systemInstruction).toBeUndefined();
  });

  it('wraps tools in a single function-declarations block', () => {
    const config = buildConfig({ instructions: '', tools: [tool] });
    expect(config.tools).toEqual([
      { functionDeclarations: [convertTool(tool)] },
    ]);
  });

  it('omits toolConfig when there are no tools even if a choice is given', () => {
    const config = buildConfig({
      instructions: '',
      tools: [],
      toolChoice: 'required',
    });
    expect(config.tools).toBeUndefined();
    expect(config.toolConfig).toBeUndefined();
  });

  it('builds toolConfig when tools and a choice are present', () => {
    const config = buildConfig({
      instructions: '',
      tools: [tool],
      toolChoice: 'auto',
    });
    expect(config.toolConfig).toEqual({
      functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
    });
  });
});

describe('convertMessages', () => {
  it('maps a text-only user turn', () => {
    const messages: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
    ];
    expect(convertMessages(messages)).toEqual([
      { role: 'user', parts: [{ text: 'Hi' }] },
    ]);
  });

  it('maps a user turn with an image to inline data', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look:' },
          { type: 'image', data: 'AAAA', mediaType: 'image/png' },
        ],
      },
    ];
    expect(convertMessages(messages)).toEqual([
      {
        role: 'user',
        parts: [
          { text: 'Look:' },
          { inlineData: { mimeType: 'image/png', data: 'AAAA' } },
        ],
      },
    ]);
  });

  it('maps an assistant turn with text and a tool call to role model', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Calling' },
          { type: 'tool_use', id: 't1', name: 'search', input: { q: 'x' } },
        ],
      },
    ];
    expect(convertMessages(messages)).toEqual([
      {
        role: 'model',
        parts: [
          { text: 'Calling' },
          { functionCall: { id: 't1', name: 'search', args: { q: 'x' } } },
        ],
      },
    ]);
  });

  it('replays thoughtSignature from provider metadata onto text and tool-call parts', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Thinking out loud',
            providerMetadata: { gemini: { thoughtSignature: 'sig-text' } },
          },
          {
            type: 'tool_use',
            id: 't1',
            name: 'search',
            input: { q: 'x' },
            providerMetadata: { gemini: { thoughtSignature: 'sig-tool' } },
          },
        ],
      },
    ];
    expect(convertMessages(messages)).toEqual([
      {
        role: 'model',
        parts: [
          { text: 'Thinking out loud', thoughtSignature: 'sig-text' },
          {
            functionCall: { id: 't1', name: 'search', args: { q: 'x' } },
            thoughtSignature: 'sig-tool',
          },
        ],
      },
    ]);
  });

  it('maps each tool result to a functionResponse part on a user turn', () => {
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
        ],
      },
    ];
    expect(convertMessages(messages)).toEqual([
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 't1',
              name: 'search',
              response: { result: 'ok' },
            },
          },
        ],
      },
    ]);
  });

  it('maps an in-thread system message to a user turn', () => {
    const messages: Message[] = [
      { role: 'system', content: [{ type: 'text', text: 'Context' }] },
    ];
    expect(convertMessages(messages)).toEqual([
      { role: 'user', parts: [{ text: 'Context' }] },
    ]);
  });

  it('drops a message that produces no parts', () => {
    const messages: Message[] = [
      { role: 'assistant', content: [{ type: 'thinking', thinking: 'hmm' }] },
    ];
    expect(convertMessages(messages)).toEqual([]);
  });
});
