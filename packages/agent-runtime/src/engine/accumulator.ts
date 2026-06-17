import type {
  AssistantMessage,
  ProviderMetadata,
  ThinkingContent,
  ToolUseContent,
} from '../contracts/message';
import type { FinishReason, ProviderChunk, Usage } from '../contracts/provider';

interface AccumulatingToolCall {
  id: string | null;
  name: string | null;
  argumentsJson: string;
  providerMetadata?: ProviderMetadata;
}

export interface ModelCallResult {
  message: AssistantMessage;
  usage: Usage;
  finishReason: FinishReason;
}

/** Assembles streamed ProviderChunks into a complete assistant message. */
export class ChunkAccumulator {
  private thinking = '';
  private thinkingId: string | null = null;
  private thinkingSignature = '';
  private text = '';
  private textProviderMetadata: ProviderMetadata = null;
  private readonly toolCalls = new Map<number, AccumulatingToolCall>();
  private usage: Usage = {};
  private finishReason: FinishReason = null;

  accept(chunk: ProviderChunk): void {
    this.acceptThinking(chunk);
    this.acceptText(chunk);
    this.acceptToolCalls(chunk);
    this.acceptMeta(chunk);
  }

  private acceptThinking(chunk: ProviderChunk): void {
    if (chunk.thinkingDelta) {
      this.thinking += chunk.thinkingDelta;
    }
    if (chunk.thinkingId) {
      this.thinkingId = chunk.thinkingId;
    }
    if (chunk.thinkingSignature) {
      this.thinkingSignature += chunk.thinkingSignature;
    }
  }

  private acceptText(chunk: ProviderChunk): void {
    if (chunk.textDelta) {
      this.text += chunk.textDelta;
    }
    if (chunk.textProviderMetadata) {
      this.textProviderMetadata = chunk.textProviderMetadata;
    }
  }

  private acceptToolCalls(chunk: ProviderChunk): void {
    for (const delta of chunk.toolCallDeltas ?? []) {
      const call = this.toolCalls.get(delta.index) ?? {
        id: null,
        name: null,
        argumentsJson: '',
      };
      call.id = delta.id ?? call.id;
      call.name = delta.name ?? call.name;
      call.argumentsJson += delta.argumentsDelta ?? '';
      if (delta.providerMetadata) {
        call.providerMetadata = delta.providerMetadata;
      }
      this.toolCalls.set(delta.index, call);
    }
  }

  private acceptMeta(chunk: ProviderChunk): void {
    if (chunk.finishReason !== undefined) {
      this.finishReason = chunk.finishReason;
    }
    if (chunk.usage) {
      this.usage = { ...this.usage, ...chunk.usage };
    }
  }

  finalize(): ModelCallResult {
    const content: AssistantMessage['content'] = [];
    const thinking = this.finalizeThinking();
    if (thinking) {
      content.push(thinking);
    }
    if (this.text) {
      content.push({
        type: 'text',
        text: this.text,
        ...(this.textProviderMetadata
          ? { providerMetadata: this.textProviderMetadata }
          : {}),
      });
    }
    content.push(...this.finalizeToolCalls());
    return {
      message: { role: 'assistant', content },
      usage: this.usage,
      finishReason: this.finishReason,
    };
  }

  private finalizeThinking(): ThinkingContent | null {
    if (!this.thinking) {
      return null;
    }
    return {
      type: 'thinking',
      thinking: this.thinking,
      id: this.thinkingId,
      signature: this.thinkingSignature || null,
    };
  }

  private finalizeToolCalls(): ToolUseContent[] {
    const entries = [...this.toolCalls.entries()].sort((a, b) => a[0] - b[0]);
    return entries.map(([index, call]) => ({
      type: 'tool_use',
      id: call.id ?? `call_${index}`,
      name: call.name ?? '',
      input: safeParseJsonObject(call.argumentsJson),
      ...(call.providerMetadata
        ? { providerMetadata: call.providerMetadata }
        : {}),
    }));
  }
}

const safeParseJsonObject = (json: string): Record<string, unknown> => {
  if (!json) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};
