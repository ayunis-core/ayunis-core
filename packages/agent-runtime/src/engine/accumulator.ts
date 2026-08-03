import type {
  AssistantMessage,
  ProviderMetadata,
  ThinkingContent,
  ToolUseContent,
} from '../contracts/message';
import type { ToolCallSnapshot } from '../contracts/event';
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
  invalidToolCallSnapshots: ToolCallSnapshot[];
}

interface FinalizedToolCalls {
  contents: ToolUseContent[];
  invalidSnapshots: ToolCallSnapshot[];
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

  accept(chunk: ProviderChunk): ToolCallSnapshot[] {
    this.acceptThinking(chunk);
    this.acceptText(chunk);
    const toolCallSnapshots = this.acceptToolCalls(chunk);
    this.acceptMeta(chunk);
    return toolCallSnapshots;
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

  private acceptToolCalls(chunk: ProviderChunk): ToolCallSnapshot[] {
    const snapshots: ToolCallSnapshot[] = [];
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
      snapshots.push(this.toSnapshot(delta.index, call, 'streaming'));
    }
    return snapshots;
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
    const toolCalls = this.finalizeToolCalls();
    content.push(...toolCalls.contents);
    return {
      message: { role: 'assistant', content },
      usage: this.usage,
      finishReason: this.finishReason,
      invalidToolCallSnapshots: toolCalls.invalidSnapshots,
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

  private finalizeToolCalls(): FinalizedToolCalls {
    const entries = [...this.toolCalls.entries()].sort((a, b) => a[0] - b[0]);
    const contents: ToolUseContent[] = [];
    const invalidSnapshots: ToolCallSnapshot[] = [];
    for (const [index, call] of entries) {
      const input = parseJsonObject(call.argumentsJson);
      if (!isNonEmpty(call.id) || !isNonEmpty(call.name) || input === null) {
        invalidSnapshots.push(this.toSnapshot(index, call, 'invalid', input));
        continue;
      }
      contents.push({
        type: 'tool_use',
        id: call.id,
        name: call.name,
        input,
        ...(call.providerMetadata
          ? { providerMetadata: call.providerMetadata }
          : {}),
      });
    }
    return { contents, invalidSnapshots };
  }

  private toSnapshot(
    index: number,
    call: AccumulatingToolCall,
    status: ToolCallSnapshot['status'],
    input: Record<string, unknown> | null = parseJsonObject(call.argumentsJson),
  ): ToolCallSnapshot {
    return {
      index,
      id: call.id,
      name: call.name,
      argumentsJson: call.argumentsJson,
      input,
      ...(call.providerMetadata
        ? { providerMetadata: call.providerMetadata }
        : {}),
      status,
    };
  }
}

const isNonEmpty = (value: string | null): value is string =>
  value !== null && value.trim().length > 0;

const parseJsonObject = (json: string): Record<string, unknown> | null => {
  if (!json) {
    return {};
  }
  return tryParseJsonObject(json) ?? tryParseJsonObject(sanitizeJson(json));
};

const tryParseJsonObject = (json: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

const sanitizeJson = (json: string): string => {
  let current = json;
  let sanitized = sanitizeJsonOnce(current);
  while (sanitized !== current) {
    current = sanitized;
    sanitized = sanitizeJsonOnce(current);
  }
  return sanitized;
};

const sanitizeJsonOnce = (json: string): string =>
  json
    .replace(/\\u000[\s"'}),\].]/g, '\\u0000')
    .replace(/\\u00[\s"'}),\].]/g, '\\u0000')
    .replace(/\\u0[\s"'}),\].]/g, '\\u0000')
    .replace(/\\u[\s"'}),\].]/g, '\\u0000')
    .replace(/\\u000$/, '')
    .replace(/\\u00$/, '')
    .replace(/\\u0$/, '')
    .replace(/\\u$/, '')
    .replace(/\\u0000/g, '')
    .replaceAll(String.fromCharCode(0), '');
