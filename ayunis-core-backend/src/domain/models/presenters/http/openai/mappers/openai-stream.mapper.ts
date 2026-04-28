import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type OpenAI from 'openai';
import type { StreamInferenceResponseChunk } from '../../../../application/ports/stream-inference.handler';

import {
  ChatCompletionChunkDto,
  ChatCompletionChunkToolCallDto,
} from '../dto/chat-completion-chunk.dto';

interface StreamContext {
  id: string;
  created: number;
  model: string;
}

@Injectable()
export class OpenAIStreamMapper {
  createContext(model: string): StreamContext {
    return {
      id: `chatcmpl-${randomUUID()}`,
      created: Math.floor(Date.now() / 1000),
      model,
    };
  }

  /**
   * Initial chunk emitted to mark the start of an assistant message.
   * Mirrors what the OpenAI SDK expects clients to see first.
   */
  initialChunk(ctx: StreamContext): ChatCompletionChunkDto {
    const chunk = {
      id: ctx.id,
      object: 'chat.completion.chunk',
      created: ctx.created,
      model: ctx.model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: '' },
          finish_reason: null,
        },
      ],
    } satisfies OpenAI.Chat.ChatCompletionChunk;
    return chunk;
  }

  toChunkDto(
    chunk: StreamInferenceResponseChunk,
    ctx: StreamContext,
  ): ChatCompletionChunkDto | null {
    const toolCalls = chunk.toolCallsDelta.map(
      (delta): ChatCompletionChunkToolCallDto => ({
        index: delta.index,
        ...(delta.id ? { id: delta.id, type: 'function' as const } : {}),
        function: {
          ...(delta.name ? { name: delta.name } : {}),
          ...(delta.argumentsDelta !== null
            ? { arguments: delta.argumentsDelta }
            : {}),
        },
      }),
    );

    const hasContent = chunk.textContentDelta !== null;
    const hasToolCalls = toolCalls.length > 0;
    const finishReason =
      chunk.finishReason !== null && chunk.finishReason !== undefined
        ? this.mapFinishReason(chunk.finishReason, hasToolCalls)
        : null;
    const usage = chunk.usage;

    if (!hasContent && !hasToolCalls && finishReason === null && !usage) {
      return null;
    }

    const delta: ChatCompletionChunkDto['choices'][number]['delta'] = {};
    if (hasContent) delta.content = chunk.textContentDelta;
    if (hasToolCalls) delta.tool_calls = toolCalls;

    const usageBlock = usage
      ? {
          prompt_tokens: usage.inputTokens ?? 0,
          completion_tokens: usage.outputTokens ?? 0,
          total_tokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        }
      : undefined;

    const result = {
      id: ctx.id,
      object: 'chat.completion.chunk',
      created: ctx.created,
      model: ctx.model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
      ...(usageBlock ? { usage: usageBlock } : {}),
    } satisfies OpenAI.Chat.ChatCompletionChunk;
    return result;
  }

  private mapFinishReason(
    upstream: string,
    hasToolCalls: boolean,
  ): 'stop' | 'length' | 'tool_calls' {
    if (hasToolCalls) return 'tool_calls';
    if (upstream === 'length') return 'length';
    if (upstream === 'tool_calls' || upstream === 'tool_use')
      return 'tool_calls';
    return 'stop';
  }
}
