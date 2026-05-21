import {
  OpenAIStreamMapper,
  OpenAIStreamSession,
} from './openai-stream.mapper';
import {
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from 'src/domain/models/application/ports/stream-inference.handler';

describe('OpenAIStreamMapper', () => {
  const mapper = new OpenAIStreamMapper();

  const make = (params: {
    text?: string | null;
    thinking?: string | null;
    toolCallsDelta?: StreamInferenceResponseChunkToolCall[];
    finishReason?: string | null;
  }): StreamInferenceResponseChunk =>
    new StreamInferenceResponseChunk({
      thinkingDelta: params.thinking ?? null,
      textContentDelta: params.text ?? null,
      toolCallsDelta: params.toolCallsDelta ?? [],
      finishReason: params.finishReason,
    });

  const newSession = () => new OpenAIStreamSession();

  it('drops empty-string textContentDelta (regression for AYC-78 finding S21)', () => {
    const result = mapper.toChunk({
      id: 'chatcmpl-1',
      modelName: 'gpt-4o',
      chunk: make({ text: '' }),
      isFirst: false,
      session: newSession(),
    });
    expect(result).toBeNull();
  });

  it('drops thinking-only chunks (no OpenAI equivalent)', () => {
    const result = mapper.toChunk({
      id: 'chatcmpl-1',
      modelName: 'gpt-4o',
      chunk: make({ thinking: 'pondering...' }),
      isFirst: false,
      session: newSession(),
    });
    expect(result).toBeNull();
  });

  it('emits content delta with role on the first non-null chunk', () => {
    const result = mapper.toChunk({
      id: 'chatcmpl-1',
      modelName: 'gpt-4o',
      chunk: make({ text: 'Hello' }),
      isFirst: true,
      session: newSession(),
    });
    expect(result?.choices[0].delta).toEqual({
      role: 'assistant',
      content: 'Hello',
    });
  });

  describe('finish_reason mapping (regression for AYC-78 finding I8)', () => {
    it("emits 'tool_calls' only when a NEW tool call appears in the same chunk", () => {
      const result = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'gpt-4o',
        chunk: make({
          finishReason: 'stop',
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: 0,
              id: 'call_1',
              name: 'lookup',
              argumentsDelta: null,
            }),
          ],
        }),
        isFirst: false,
        session: newSession(),
      });
      expect(result?.choices[0].finish_reason).toBe('tool_calls');
    });

    it("preserves 'stop' when only an argument-delta continuation is present", () => {
      const result = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'gpt-4o',
        chunk: make({
          finishReason: 'stop',
          toolCallsDelta: [
            // Continuation chunk: no id, no name — argument bytes only.
            new StreamInferenceResponseChunkToolCall({
              index: 0,
              id: null,
              name: null,
              argumentsDelta: '"value"',
            }),
          ],
        }),
        isFirst: false,
        session: newSession(),
      });
      expect(result?.choices[0].finish_reason).toBe('stop');
    });

    it('emits null finish_reason for chunks without one', () => {
      const result = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'gpt-4o',
        chunk: make({ text: 'partial' }),
        isFirst: false,
        session: newSession(),
      });
      expect(result?.choices[0].finish_reason).toBeNull();
    });
  });

  describe('tool-call index remapping (regression for AYC-132 bug 3)', () => {
    it('remaps a single non-zero provider index to OpenAI index 0', () => {
      // Anthropic emits content-block index 1 for a tool call that follows
      // a text content block at index 0. OpenAI clients expect tool_calls
      // to be zero-based by position in tool_calls[].
      const session = newSession();
      const result = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'claude-sonnet',
        chunk: make({
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: 1,
              id: 'call_1',
              name: 'lookup',
              argumentsDelta: null,
            }),
          ],
        }),
        isFirst: false,
        session,
      });
      expect(result?.choices[0].delta.tool_calls?.[0].index).toBe(0);
    });

    it('keeps the same OpenAI index across argument-delta continuations of the same provider call', () => {
      const session = newSession();
      const first = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'claude-sonnet',
        chunk: make({
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: 1,
              id: 'call_1',
              name: 'lookup',
              argumentsDelta: null,
            }),
          ],
        }),
        isFirst: false,
        session,
      });
      const continuation = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'claude-sonnet',
        chunk: make({
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: 1,
              id: null,
              name: null,
              argumentsDelta: '"value"',
            }),
          ],
        }),
        isFirst: false,
        session,
      });
      expect(first?.choices[0].delta.tool_calls?.[0].index).toBe(0);
      expect(continuation?.choices[0].delta.tool_calls?.[0].index).toBe(0);
    });

    it('assigns 0, 1, 2 to parallel tool calls regardless of provider indices', () => {
      const session = newSession();
      const first = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'claude-sonnet',
        chunk: make({
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: 1,
              id: 'call_paris',
              name: 'get_weather',
              argumentsDelta: null,
            }),
          ],
        }),
        isFirst: false,
        session,
      });
      const second = mapper.toChunk({
        id: 'chatcmpl-1',
        modelName: 'claude-sonnet',
        chunk: make({
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: 2,
              id: 'call_tokyo',
              name: 'get_weather',
              argumentsDelta: null,
            }),
          ],
        }),
        isFirst: false,
        session,
      });
      expect(first?.choices[0].delta.tool_calls?.[0].index).toBe(0);
      expect(second?.choices[0].delta.tool_calls?.[0].index).toBe(1);
    });
  });
});
