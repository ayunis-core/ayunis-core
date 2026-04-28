import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type OpenAI from 'openai';

import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { InferenceResponse } from '../../../../application/ports/inference.handler';

import {
  ChatCompletionResponseDto,
  ChatCompletionToolCallResponseDto,
} from '../dto/chat-completion-response.dto';

@Injectable()
export class OpenAIResponseMapper {
  toResponseDto(
    response: InferenceResponse,
    requestedModelId: string,
  ): ChatCompletionResponseDto {
    const textParts: string[] = [];
    const toolCalls: ChatCompletionToolCallResponseDto[] = [];

    for (const part of response.content) {
      if (part instanceof TextMessageContent) {
        textParts.push(part.text);
      } else if (part instanceof ToolUseMessageContent) {
        toolCalls.push({
          id: part.id,
          type: 'function',
          function: {
            name: part.name,
            arguments: JSON.stringify(part.params),
          },
        });
      }
      // ThinkingMessageContent is intentionally dropped — OpenAI's contract
      // has no place for it.
    }

    const finishReason: 'tool_calls' | 'stop' =
      toolCalls.length > 0 ? 'tool_calls' : 'stop';
    const content = textParts.length > 0 ? textParts.join('') : null;

    const dto = {
      id: `chatcmpl-${randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: requestedModelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
            refusal: null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          },
          logprobs: null,
          finish_reason: finishReason,
        },
      ],
      usage: {
        prompt_tokens: response.meta.inputTokens ?? 0,
        completion_tokens: response.meta.outputTokens ?? 0,
        total_tokens:
          response.meta.totalTokens ??
          (response.meta.inputTokens ?? 0) + (response.meta.outputTokens ?? 0),
      },
    } satisfies OpenAI.Chat.ChatCompletion;

    return dto;
  }
}
