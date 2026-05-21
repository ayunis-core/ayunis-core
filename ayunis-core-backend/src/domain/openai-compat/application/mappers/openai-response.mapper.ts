import { Injectable } from '@nestjs/common';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
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
  }): ChatCompletionResponse {
    const message = this.buildAssistantMessage(params.response);
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
  ): ChatCompletionResponseMessage {
    let textContent = '';
    const toolCalls: ChatCompletionToolCallResponse[] = [];

    for (const block of response.content) {
      if (block instanceof TextMessageContent) {
        textContent += block.text;
      } else if (block instanceof ToolUseMessageContent) {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.params),
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
