import { OpenAIResponseMapper } from './openai-response.mapper';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';

const searchTool: ToolSchema = {
  name: 'search_customers',
  description: 'Search customers',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      churnDate: { type: 'string', format: 'date' },
    },
  },
};

function responseWithToolCall(
  params: Record<string, unknown>,
): InferenceResponse {
  return {
    content: [new ToolUseMessageContent('call-1', 'search_customers', params)],
    meta: {},
  };
}

describe('OpenAIResponseMapper', () => {
  const mapper = new OpenAIResponseMapper();

  // The gateway's strict-mode normalization invites the model to emit nulls
  // for optional params; the external consumer executing the tool never
  // opted into that convention, so the nulls must not leave the gateway.
  it('strips schema-disallowed nulls from outbound tool-call arguments', () => {
    const result = mapper.toResponse({
      id: 'cmpl-1',
      modelName: 'gpt-4o',
      response: responseWithToolCall({
        name: 'Stadt Ladenburg',
        churnDate: null,
      }),
      tools: [searchTool],
    });

    const toolCall = result.choices[0].message.tool_calls?.[0];
    expect(JSON.parse(toolCall?.function.arguments ?? '{}')).toEqual({
      name: 'Stadt Ladenburg',
    });
  });

  it('passes tool-call arguments through when no matching tool schema exists', () => {
    const result = mapper.toResponse({
      id: 'cmpl-1',
      modelName: 'gpt-4o',
      response: responseWithToolCall({ name: 'x', churnDate: null }),
      tools: [],
    });

    const toolCall = result.choices[0].message.tool_calls?.[0];
    expect(JSON.parse(toolCall?.function.arguments ?? '{}')).toEqual({
      name: 'x',
      churnDate: null,
    });
  });

  it('maps text content and finish reason', () => {
    const result = mapper.toResponse({
      id: 'cmpl-1',
      modelName: 'gpt-4o',
      response: {
        content: [new TextMessageContent('hello')],
        meta: {},
      },
      tools: [],
    });

    expect(result.choices[0].message.content).toBe('hello');
    expect(result.choices[0].finish_reason).toBe('stop');
  });
});
