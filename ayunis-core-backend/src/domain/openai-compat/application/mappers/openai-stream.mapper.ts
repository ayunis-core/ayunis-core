import { Injectable } from '@nestjs/common';
import type { StreamInferenceResponseChunk } from 'src/domain/models/application/ports/stream-inference.handler';
import type {
  ChatCompletionChunk,
  ChatCompletionChunkToolCallDelta,
} from '../types/openai-chunk.types';
import type { ChatCompletionFinishReason } from '../types/openai-response.types';

/**
 * Per-stream state carried across chunks. Currently only translates
 * provider-native tool-call indices (Anthropic uses absolute content-block
 * positions, so a single tool call mid-message arrives as e.g. index=1
 * because text occupies index=0) into the contiguous, zero-based indices
 * the OpenAI streaming spec defines for `tool_calls[]`.
 *
 * SDK clients reconstruct the tool_calls array by index, so a non-zero
 * first index leaves slot 0 undefined and the call effectively vanishes.
 */
export class OpenAIStreamSession {
  private readonly indexMap = new Map<number, number>();
  private nextIndex = 0;

  resolveToolCallIndex(providerIndex: number): number {
    const cached = this.indexMap.get(providerIndex);
    if (cached !== undefined) return cached;
    const allocated = this.nextIndex++;
    this.indexMap.set(providerIndex, allocated);
    return allocated;
  }
}

@Injectable()
export class OpenAIStreamMapper {
  /**
   * Converts a domain stream chunk into an OpenAI-compat chunk, or `null`
   * when the chunk has no user-visible content (e.g. empty text deltas,
   * thinking-only chunks, or pure usage frames the caller folds via
   * `extractUsage` instead).
   *
   * AYC-78 fixes:
   * - Empty `textContentDelta` (`''`) is dropped — the previous mapper
   *   leaked these as zero-content frames (finding S21).
   * - `finish_reason='tool_calls'` is emitted ONLY when the same chunk
   *   introduces a NEW tool call (id or name present). Argument-only
   *   continuations preserve whatever `finish_reason` the provider sent
   *   (finding I8).
   *
   * AYC-132 fix:
   * - Tool-call indices are remapped through `session` so the
   *   OpenAI-spec-required contiguous zero-based numbering is preserved
   *   regardless of what the upstream provider emits.
   */
  toChunk(params: {
    id: string;
    modelName: string;
    chunk: StreamInferenceResponseChunk;
    isFirst: boolean;
    session: OpenAIStreamSession;
  }): ChatCompletionChunk | null {
    const { chunk, session } = params;

    const hasContent =
      chunk.textContentDelta !== null && chunk.textContentDelta.length > 0;
    const toolCallDeltas = this.mapToolCallDeltas(
      chunk.toolCallsDelta,
      session,
    );
    const hasToolCallDelta = toolCallDeltas.length > 0;
    const hasFinish =
      chunk.finishReason !== undefined && chunk.finishReason !== null;

    if (!hasContent && !hasToolCallDelta && !hasFinish) {
      return null;
    }

    const hasNewToolCall = chunk.toolCallsDelta.some(
      (d) => d.id !== null || d.name !== null,
    );

    const finishReason: ChatCompletionFinishReason = hasFinish
      ? this.mapFinishReason(chunk.finishReason ?? null, hasNewToolCall)
      : null;

    return {
      id: params.id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: params.modelName,
      choices: [
        {
          index: 0,
          delta: {
            ...(params.isFirst && { role: 'assistant' }),
            ...(hasContent && { content: chunk.textContentDelta }),
            ...(hasToolCallDelta && { tool_calls: toolCallDeltas }),
          },
          finish_reason: finishReason,
        },
      ],
    };
  }

  private mapToolCallDeltas(
    deltas: StreamInferenceResponseChunk['toolCallsDelta'],
    session: OpenAIStreamSession,
  ): ChatCompletionChunkToolCallDelta[] {
    return deltas.map((d) => ({
      index: session.resolveToolCallIndex(d.index),
      ...(d.id !== null && { id: d.id }),
      ...(d.name !== null && { type: 'function' as const }),
      ...((d.name !== null || d.argumentsDelta !== null) && {
        function: {
          ...(d.name !== null && { name: d.name }),
          ...(d.argumentsDelta !== null && { arguments: d.argumentsDelta }),
        },
      }),
    }));
  }

  private mapFinishReason(
    providerReason: string | null,
    hasNewToolCall: boolean,
  ): ChatCompletionFinishReason {
    if (providerReason === null) return null;
    if (hasNewToolCall) return 'tool_calls';
    switch (providerReason) {
      case 'stop':
      case 'length':
      case 'tool_calls':
      case 'content_filter':
        return providerReason;
      default:
        return 'stop';
    }
  }
}
