import { OpenAIStreamMapper } from './openai-stream.mapper';
import {
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../../../application/ports/stream-inference.handler';

describe('OpenAIStreamMapper', () => {
  let mapper: OpenAIStreamMapper;

  beforeEach(() => {
    mapper = new OpenAIStreamMapper();
  });

  describe('createContext', () => {
    it('returns a context with chatcmpl-<uuid> id, Unix-seconds created, and the input model', () => {
      const before = Math.floor(Date.now() / 1000);
      const ctx = mapper.createContext('gpt-4o');
      const after = Math.floor(Date.now() / 1000);

      expect(ctx.id).toMatch(
        /^chatcmpl-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(Number.isInteger(ctx.created)).toBe(true);
      expect(ctx.created).toBeGreaterThanOrEqual(before);
      expect(ctx.created).toBeLessThanOrEqual(after);
      expect(ctx.model).toBe('gpt-4o');
    });
  });

  describe('initialChunk', () => {
    it('emits a chat.completion.chunk with role=assistant, empty content, and null finish_reason', () => {
      const ctx = mapper.createContext('gpt-4o');

      const chunk = mapper.initialChunk(ctx);

      expect(chunk.id).toBe(ctx.id);
      expect(chunk.object).toBe('chat.completion.chunk');
      expect(chunk.created).toBe(ctx.created);
      expect(chunk.model).toBe(ctx.model);
      expect(chunk.choices).toHaveLength(1);
      expect(chunk.choices[0].index).toBe(0);
      expect(chunk.choices[0].delta.role).toBe('assistant');
      expect(chunk.choices[0].delta.content).toBe('');
      expect(chunk.choices[0].finish_reason).toBeNull();
    });
  });

  describe('toChunkDto', () => {
    const ctx = { id: 'chatcmpl-test', created: 12345, model: 'gpt-4o' };

    it('maps a text-only chunk into delta.content with no tool_calls or finish_reason', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: 'hello',
        toolCallsDelta: [],
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].delta.content).toBe('hello');
      expect(result!.choices[0].delta.tool_calls).toBeUndefined();
      expect(result!.choices[0].finish_reason).toBeNull();
      expect(result!.usage).toBeUndefined();
    });

    it('maps a tool-call-only chunk into delta.tool_calls with index/id/type/function fields', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: 0,
            id: 'call_1',
            name: 'get_weather',
            argumentsDelta: '{"city":"Be',
          }),
        ],
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].delta.content).toBeUndefined();
      const toolCalls = result!.choices[0].delta.tool_calls!;
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].index).toBe(0);
      expect(toolCalls[0].id).toBe('call_1');
      expect(toolCalls[0].type).toBe('function');
      expect(toolCalls[0].function!.name).toBe('get_weather');
      expect(toolCalls[0].function!.arguments).toBe('{"city":"Be');
    });

    it('returns null for an empty chunk (no content, no tool calls, no finish reason, no usage)', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: 'still thinking',
        textContentDelta: null,
        toolCallsDelta: [],
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).toBeNull();
    });

    it('maps finishReason "stop" to "stop"', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [],
        finishReason: 'stop',
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].finish_reason).toBe('stop');
    });

    it('maps finishReason "tool_calls" to "tool_calls"', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [],
        finishReason: 'tool_calls',
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].finish_reason).toBe('tool_calls');
    });

    it('maps finishReason "length" to "length"', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [],
        finishReason: 'length',
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].finish_reason).toBe('length');
    });

    it('overrides finishReason to "tool_calls" when a NEW tool call (id/name) lands in the SAME chunk as finishReason "stop"', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: 0,
            id: 'call_1',
            name: 'get_weather',
            argumentsDelta: '{}',
          }),
        ],
        finishReason: 'stop',
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].finish_reason).toBe('tool_calls');
    });

    it('does NOT override finishReason "stop" when the toolCallsDelta is only an argumentsDelta continuation (id and name are null)', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: 0,
            id: null,
            name: null,
            argumentsDelta: '"city":"Berlin"}',
          }),
        ],
        finishReason: 'stop',
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.choices[0].finish_reason).toBe('stop');
    });

    it('drops a chunk whose textContentDelta is the empty string and has no other signal', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: '',
        toolCallsDelta: [],
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).toBeNull();
    });

    it('emits usage only when chunk.usage is set', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [],
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 20 },
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      });
    });

    it('omits usage when chunk.usage is not set', () => {
      const chunk = new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: 'hi',
        toolCallsDelta: [],
      });

      const result = mapper.toChunkDto(chunk, ctx);

      expect(result).not.toBeNull();
      expect(result!.usage).toBeUndefined();
    });
  });
});
