import { Injectable } from '@nestjs/common';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import type {
  ChatCompletionResponse,
  ChatCompletionResponseChoice,
  ChatCompletionResponseMessage,
  ChatCompletionToolCallResponse,
} from '../types/openai-response.types';

@Injectable()
export class OpenAIResponseMapper {
  toResponse(params: {
    id: string;
    modelName: string;
    response: InferenceResponse;
    tools: readonly ToolSchema[];
  }): ChatCompletionResponse {
    const message = this.buildAssistantMessage(params.response, params.tools);
    const finishReason: ChatCompletionResponseChoice['finish_reason'] =
      message.tool_calls && message.tool_calls.length > 0
        ? 'tool_calls'
        : 'stop';

    return {
      id: params.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: params.modelName,
      choices: [{ index: 0, message, finish_reason: finishReason }],
      usage:
        params.response.meta.inputTokens !== undefined &&
        params.response.meta.outputTokens !== undefined
          ? {
              prompt_tokens: params.response.meta.inputTokens,
              completion_tokens: params.response.meta.outputTokens,
              total_tokens:
                params.response.meta.totalTokens ??
                params.response.meta.inputTokens +
                  params.response.meta.outputTokens,
            }
          : undefined,
    };
  }

  private buildAssistantMessage(
    response: InferenceResponse,
    tools: readonly ToolSchema[],
  ): ChatCompletionResponseMessage {
    let textContent = '';
    const toolCalls: ChatCompletionToolCallResponse[] = [];

    for (const block of response.content) {
      if (block instanceof TextMessageContent) {
        textContent += block.text;
      } else if (block instanceof ToolUseMessageContent) {
        // The consumer executes this tool call against their own schema —
        // remove the nulls our strict-mode normalization invited, which the
        // consumer's tools never opted into. Only possible here: the
        // streaming path emits arguments as raw text deltas and cannot strip
        // without buffering whole tool calls.
        const schema = tools.find((tool) => tool.name === block.name);
        const args = schema
          ? stripDisallowedNulls(block.params, schema.parameters)
          : block.params;
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(args),
          },
        });
      }
      // ThinkingMessageContent is dropped — OpenAI's schema has no equivalent.
    }

    return {
      role: 'assistant',
      content: textContent.length > 0 ? textContent : null,
      ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    };
  }
}
