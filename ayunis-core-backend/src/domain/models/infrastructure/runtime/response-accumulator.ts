import type {
  FinishReason,
  ProviderChunk,
  ToolCallDelta,
  Usage,
} from '@ayunis/inference';
import { InferenceResponse } from '../../application/ports/inference.handler';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

interface ToolCallAccumulator {
  id: string;
  name: string;
  args: string;
}

type ResponseContent =
  | TextMessageContent
  | ToolUseMessageContent
  | ThinkingMessageContent;

interface ResponseMeta {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/**
 * Drives a `@ayunis` ModelProvider stream to completion and folds the deltas
 * into a single non-streaming `InferenceResponse`. Needed because the provider
 * packages are streaming-only, while the backend's `InferenceHandler` port
 * (used by e.g. title generation) is request/response.
 */
export async function accumulateResponse(
  stream: AsyncIterable<ProviderChunk>,
): Promise<InferenceResponse> {
  return new StreamResponseAccumulator().consume(stream);
}

class StreamResponseAccumulator {
  private text = '';
  private thinking = '';
  private thinkingId: string | null = null;
  private thinkingSignature: string | null = null;
  private readonly toolCalls = new Map<number, ToolCallAccumulator>();
  private inputTokens?: number;
  private outputTokens?: number;
  private finishReason: FinishReason = null;

  async consume(
    stream: AsyncIterable<ProviderChunk>,
  ): Promise<InferenceResponse> {
    for await (const chunk of stream) {
      this.apply(chunk);
    }
    return this.build();
  }

  private apply(chunk: ProviderChunk): void {
    if (chunk.textDelta) this.text += chunk.textDelta;
    if (chunk.thinkingDelta) this.thinking += chunk.thinkingDelta;
    if (chunk.thinkingId) this.thinkingId = chunk.thinkingId;
    if (chunk.thinkingSignature)
      this.thinkingSignature = chunk.thinkingSignature;
    if (chunk.finishReason) this.finishReason = chunk.finishReason;
    this.applyToolDeltas(chunk.toolCallDeltas);
    this.applyUsage(chunk.usage);
  }

  private applyToolDeltas(deltas: ToolCallDelta[] | undefined): void {
    for (const delta of deltas ?? []) {
      const call = this.getOrCreateCall(delta.index);
      if (delta.id) call.id = delta.id;
      if (delta.name) call.name = delta.name;
      if (delta.argumentsDelta) call.args += delta.argumentsDelta;
    }
  }

  private getOrCreateCall(index: number): ToolCallAccumulator {
    const existing = this.toolCalls.get(index);
    if (existing) return existing;
    const created: ToolCallAccumulator = { id: '', name: '', args: '' };
    this.toolCalls.set(index, created);
    return created;
  }

  private applyUsage(usage: Usage | undefined): void {
    if (!usage) return;
    if (usage.inputTokens !== undefined) this.inputTokens = usage.inputTokens;
    if (usage.outputTokens !== undefined)
      this.outputTokens = usage.outputTokens;
  }

  private build(): InferenceResponse {
    // A non-streaming completion that hit the token limit is truncated, not a
    // valid answer. Surface it instead of returning a partial response as
    // success (e.g. for title generation), matching the pre-runtime handler.
    if (this.finishReason === 'length') {
      throw new InferenceFailedError(
        'Model response was truncated (reached the maximum token limit)',
      );
    }
    const content: ResponseContent[] = [];
    if (this.thinking) {
      content.push(
        new ThinkingMessageContent(
          this.thinking,
          this.thinkingId,
          this.thinkingSignature,
        ),
      );
    }
    if (this.text) {
      content.push(new TextMessageContent(this.text));
    }
    // Map preserves insertion order, which matches the tool-call index order
    // in which deltas stream in.
    for (const call of this.toolCalls.values()) {
      content.push(
        new ToolUseMessageContent(call.id, call.name, parseArgs(call.args)),
      );
    }
    return new InferenceResponse(content, this.buildMeta());
  }

  private buildMeta(): ResponseMeta {
    const { inputTokens, outputTokens } = this;
    const totalTokens =
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined;
    return { inputTokens, outputTokens, totalTokens };
  }
}

function parseArgs(args: string): Record<string, unknown> {
  if (!args) return {};
  try {
    return JSON.parse(args) as Record<string, unknown>;
  } catch {
    return {};
  }
}
