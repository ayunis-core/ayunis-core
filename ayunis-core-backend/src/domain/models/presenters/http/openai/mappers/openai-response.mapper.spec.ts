import { OpenAIResponseMapper } from './openai-response.mapper';
import { InferenceResponse } from '../../../../application/ports/inference.handler';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

describe('OpenAIResponseMapper', () => {
  let mapper: OpenAIResponseMapper;

  beforeEach(() => {
    mapper = new OpenAIResponseMapper();
  });

  it('maps a plain text response with finish_reason "stop" and undefined tool_calls', () => {
    const response = new InferenceResponse(
      [new TextMessageContent('hello world')],
      { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
    );

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.choices).toHaveLength(1);
    expect(dto.choices[0].message.role).toBe('assistant');
    expect(dto.choices[0].message.content).toBe('hello world');
    expect(dto.choices[0].finish_reason).toBe('stop');
    expect(dto.choices[0].message.tool_calls).toBeUndefined();
  });

  it('concatenates multiple TextMessageContent parts', () => {
    const response = new InferenceResponse(
      [new TextMessageContent('a'), new TextMessageContent('b')],
      {},
    );

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.choices[0].message.content).toBe('ab');
  });

  it('maps a tool-use response with finish_reason "tool_calls" and content === null', () => {
    const params = { city: 'Berlin' };
    const response = new InferenceResponse(
      [new ToolUseMessageContent('call_1', 'get_weather', params)],
      {},
    );

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.choices[0].finish_reason).toBe('tool_calls');
    expect(dto.choices[0].message.content).toBeNull();
    expect(dto.choices[0].message.tool_calls).toHaveLength(1);
    const call = dto.choices[0].message.tool_calls![0];
    expect(call.id).toBe('call_1');
    expect(call.type).toBe('function');
    expect(call.function.name).toBe('get_weather');
    expect(call.function.arguments).toBe(JSON.stringify(params));
  });

  it('drops ThinkingMessageContent silently (not in tool_calls or content)', () => {
    const response = new InferenceResponse(
      [
        new ThinkingMessageContent('reasoning steps'),
        new TextMessageContent('answer'),
      ],
      {},
    );

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.choices[0].message.content).toBe('answer');
    expect(dto.choices[0].message.tool_calls).toBeUndefined();
  });

  it('populates usage from response meta', () => {
    const response = new InferenceResponse([new TextMessageContent('hi')], {
      inputTokens: 11,
      outputTokens: 22,
      totalTokens: 33,
    });

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.usage.prompt_tokens).toBe(11);
    expect(dto.usage.completion_tokens).toBe(22);
    expect(dto.usage.total_tokens).toBe(33);
  });

  it('falls back total_tokens to inputTokens + outputTokens when meta.totalTokens is undefined', () => {
    const response = new InferenceResponse([new TextMessageContent('hi')], {
      inputTokens: 4,
      outputTokens: 6,
    });

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.usage.total_tokens).toBe(10);
  });

  it('produces total_tokens === 0 when input/output tokens are both undefined', () => {
    const response = new InferenceResponse([new TextMessageContent('hi')], {});

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    expect(dto.usage.prompt_tokens).toBe(0);
    expect(dto.usage.completion_tokens).toBe(0);
    expect(dto.usage.total_tokens).toBe(0);
  });

  it('produces id matching `chatcmpl-<uuid>`, object "chat.completion", and a recent `created` Unix timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const response = new InferenceResponse([new TextMessageContent('hi')], {});

    const dto = mapper.toResponseDto(response, 'gpt-4o');

    const after = Math.floor(Date.now() / 1000);
    expect(dto.id).toMatch(
      /^chatcmpl-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(dto.object).toBe('chat.completion');
    expect(Number.isInteger(dto.created)).toBe(true);
    expect(dto.created).toBeGreaterThanOrEqual(before);
    expect(dto.created).toBeLessThanOrEqual(after);
  });

  it('echoes the requestedModelId argument back as the response.model', () => {
    const response = new InferenceResponse([new TextMessageContent('hi')], {});

    const dto = mapper.toResponseDto(response, 'my-custom-model-id');

    expect(dto.model).toBe('my-custom-model-id');
  });
});
