import { ToolNameCodec } from '@ayunis/inference';
import type { ResponseStreamEvent } from 'openai/resources/responses/responses';
import { describe, expect, it } from 'vitest';

import {
  convertResponseEvent,
  createResponseConversionState,
} from './convert-response-event';

const codec = new ToolNameCodec([
  { name: 'notion.search', description: 'Search Notion', parameters: {} },
]);
const event = (value: unknown): ResponseStreamEvent =>
  value as ResponseStreamEvent;

describe('convertResponseEvent', () => {
  it('maps output text and refusal deltas to text', () => {
    expect(
      convertResponseEvent(
        event({ type: 'response.output_text.delta', delta: 'Hello' }),
        codec,
      ),
    ).toEqual({ textDelta: 'Hello' });
    expect(
      convertResponseEvent(
        event({ type: 'response.refusal.delta', delta: 'I cannot help.' }),
        codec,
      ),
    ).toEqual({ textDelta: 'I cannot help.' });
  });

  it('attaches completed encrypted reasoning to the next function call', () => {
    const state = createResponseConversionState();
    const reasoning = {
      id: 'rs_123',
      type: 'reasoning',
      summary: [],
      encrypted_content: 'encrypted-state',
      status: 'completed',
    };

    expect(
      convertResponseEvent(
        event({ type: 'response.output_item.done', item: reasoning }),
        codec,
        state,
      ),
    ).toBeNull();
    expect(
      convertResponseEvent(
        event({
          type: 'response.output_item.added',
          output_index: 1,
          item: {
            type: 'function_call',
            call_id: 'call_123',
            name: 'notion_search',
            arguments: '',
          },
        }),
        codec,
        state,
      ),
    ).toEqual({
      toolCallDeltas: [
        expect.objectContaining({
          providerMetadata: {
            wireName: 'notion_search',
            openaiReasoning: [reasoning],
          },
        }),
      ],
    });
  });

  it('attaches completed encrypted reasoning to a text response', () => {
    const state = createResponseConversionState();
    const reasoning = {
      id: 'rs_123',
      type: 'reasoning',
      summary: [],
      encrypted_content: 'encrypted-state',
      status: 'completed',
    };

    convertResponseEvent(
      event({ type: 'response.output_item.done', item: reasoning }),
      codec,
      state,
    );

    expect(
      convertResponseEvent(
        event({
          type: 'response.completed',
          response: {
            output: [{ type: 'message' }],
            usage: { input_tokens: 8, output_tokens: 3 },
          },
        }),
        codec,
        state,
      ),
    ).toEqual({
      finishReason: 'stop',
      usage: { inputTokens: 8, outputTokens: 3 },
      textProviderMetadata: { openaiReasoning: [reasoning] },
    });
  });

  it('starts function calls with the stable call id and decoded name', () => {
    expect(
      convertResponseEvent(
        event({
          type: 'response.output_item.added',
          output_index: 2,
          item: {
            type: 'function_call',
            call_id: 'call_123',
            name: 'notion_search',
            arguments: '',
          },
        }),
        codec,
      ),
    ).toEqual({
      toolCallDeltas: [
        {
          index: 2,
          id: 'call_123',
          name: 'notion.search',
          argumentsDelta: null,
          providerMetadata: { wireName: 'notion_search' },
        },
      ],
    });
  });

  it('maps function argument deltas', () => {
    expect(
      convertResponseEvent(
        event({
          type: 'response.function_call_arguments.delta',
          output_index: 2,
          delta: '{"query":',
        }),
        codec,
      ),
    ).toEqual({
      toolCallDeltas: [
        {
          index: 2,
          id: null,
          name: null,
          argumentsDelta: '{"query":',
        },
      ],
    });
  });

  it('maps completed tool responses and usage', () => {
    expect(
      convertResponseEvent(
        event({
          type: 'response.completed',
          response: {
            output: [{ type: 'function_call' }],
            usage: { input_tokens: 45, output_tokens: 12 },
          },
        }),
        codec,
      ),
    ).toEqual({
      finishReason: 'tool_calls',
      usage: { inputTokens: 45, outputTokens: 12 },
    });
  });

  it('maps completed text responses to stop', () => {
    expect(
      convertResponseEvent(
        event({
          type: 'response.completed',
          response: {
            output: [{ type: 'message' }],
            usage: { input_tokens: 8, output_tokens: 3 },
          },
        }),
        codec,
      ),
    ).toEqual({
      finishReason: 'stop',
      usage: { inputTokens: 8, outputTokens: 3 },
    });
  });

  it('maps output-token exhaustion to length', () => {
    expect(
      convertResponseEvent(
        event({
          type: 'response.incomplete',
          response: {
            incomplete_details: { reason: 'max_output_tokens' },
            output: [{ type: 'message' }],
            usage: { input_tokens: 8, output_tokens: 100 },
          },
        }),
        codec,
      ),
    ).toEqual({
      finishReason: 'length',
      usage: { inputTokens: 8, outputTokens: 100 },
    });
  });

  it('marks incomplete tool output as unusable', () => {
    expect(
      convertResponseEvent(
        event({
          type: 'response.incomplete',
          response: {
            incomplete_details: { reason: 'content_filter' },
            output: [{ type: 'function_call' }],
          },
        }),
        codec,
      ),
    ).toEqual({ finishReason: 'length' });
  });

  it('ignores events without provider-facing output', () => {
    expect(
      convertResponseEvent(
        event({ type: 'response.output_text.done', text: 'Hello' }),
        codec,
      ),
    ).toBeNull();
  });

  it('classifies failed client responses as provider rejections', () => {
    expect(() =>
      convertResponseEvent(
        event({
          type: 'response.failed',
          response: {
            error: { code: 'invalid_prompt', message: 'Prompt rejected.' },
          },
        }),
        codec,
      ),
    ).toThrow(
      expect.objectContaining({
        message: 'Prompt rejected.',
        code: 'invalid_prompt',
        status: 400,
      }),
    );
  });

  it('classifies image validation failures as provider rejections', () => {
    expect(() =>
      convertResponseEvent(
        event({
          type: 'response.failed',
          response: {
            error: { code: 'image_too_large', message: 'Image too large.' },
          },
        }),
        codec,
      ),
    ).toThrow(
      expect.objectContaining({
        code: 'image_too_large',
        status: 400,
      }),
    );
  });

  it('classifies transient stream errors for host retries', () => {
    expect(() =>
      convertResponseEvent(
        event({
          type: 'error',
          code: 'no_capacity',
          message: 'The model is currently unavailable.',
          param: null,
        }),
        codec,
      ),
    ).toThrow(
      expect.objectContaining({
        message: 'The model is currently unavailable.',
        code: 'no_capacity',
        status: 429,
      }),
    );
  });
});
