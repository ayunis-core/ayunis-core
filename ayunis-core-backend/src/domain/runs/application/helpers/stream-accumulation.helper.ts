import type { ProviderMetadata } from 'src/domain/messages/domain/message-contents/provider-metadata.type';

/**
 * Structural view of a streamed inference chunk — only the fields the
 * accumulator reads. Kept local so this helper does not depend on the
 * models module's ports (StreamInferenceResponseChunk satisfies it).
 */
export interface StreamedChunk {
  thinkingDelta: string | null;
  thinkingId?: string | null;
  thinkingSignature?: string | null;
  textContentDelta: string | null;
  textProviderMetadata?: ProviderMetadata;
  toolCallsDelta: StreamedToolCallDelta[];
  finishReason?: string | null;
}

export interface StreamedToolCallDelta {
  index: number;
  id?: string | null;
  name?: string | null;
  argumentsDelta?: string | null;
  providerMetadata?: ProviderMetadata;
}

export interface AccumulatedToolCall {
  id: string | null;
  name: string | null;
  arguments: string;
  providerMetadata: ProviderMetadata;
}

export interface AccumulatedState {
  text: string;
  thinking: string;
  textProviderMetadata: ProviderMetadata;
  thinkingId: string | null;
  thinkingSignature: string | null;
  toolCalls: Map<number, AccumulatedToolCall>;
  finishReason: string | null;
  /**
   * Set when the turn's tool calls failed the integrity check. The whole
   * tool phase must then be excluded from the saved message — persisting
   * even the intact sibling calls would let the next run execute half a
   * turn the model never saw results for.
   */
  toolCallsCorrupted: boolean;
}

export const initialAccumulatedState = (): AccumulatedState => ({
  text: '',
  thinking: '',
  textProviderMetadata: null,
  thinkingId: null,
  thinkingSignature: null,
  toolCalls: new Map(),
  finishReason: null,
  toolCallsCorrupted: false,
});

/**
 * Folds one streamed chunk into the accumulated state. Returns whether the
 * chunk carried content worth re-rendering (deltas), as opposed to
 * metadata-only chunks (finish reason, signatures, usage).
 */
export function accumulateChunk(
  chunk: StreamedChunk,
  state: AccumulatedState,
): boolean {
  let shouldUpdate = false;

  if (chunk.thinkingDelta) {
    state.thinking += chunk.thinkingDelta;
    shouldUpdate = true;
  }
  if (chunk.thinkingId) {
    state.thinkingId = chunk.thinkingId;
  }
  if (chunk.thinkingSignature) {
    state.thinkingSignature = chunk.thinkingSignature;
  }

  if (chunk.textContentDelta) {
    state.text += chunk.textContentDelta;
    shouldUpdate = true;
  }
  if (chunk.textProviderMetadata) {
    state.textProviderMetadata = chunk.textProviderMetadata;
  }

  if (chunk.toolCallsDelta.length > 0) {
    accumulateToolCalls(chunk.toolCallsDelta, state.toolCalls);
    shouldUpdate = true;
  }
  if (chunk.finishReason) {
    state.finishReason = chunk.finishReason;
  }

  return shouldUpdate;
}

function accumulateToolCalls(
  deltas: StreamedToolCallDelta[],
  toolCalls: Map<number, AccumulatedToolCall>,
): void {
  for (const toolCall of deltas) {
    const existing = toolCalls.get(toolCall.index) ?? {
      id: null,
      name: null,
      arguments: '',
      providerMetadata: null,
    };

    toolCalls.set(toolCall.index, {
      id: toolCall.id ?? existing.id,
      name: toolCall.name ?? existing.name,
      arguments: existing.arguments + (toolCall.argumentsDelta ?? ''),
      providerMetadata: toolCall.providerMetadata ?? existing.providerMetadata,
    });
  }
}
