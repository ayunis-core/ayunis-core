import type { ProviderMetadata } from 'src/domain/messages/domain/message-contents/provider-metadata.type';

export class StreamInferenceResponseChunkToolCall {
  public readonly index: number;
  public readonly id: string | null;
  public readonly name: string | null;
  public readonly argumentsDelta: string | null;
  public readonly providerMetadata: ProviderMetadata;

  constructor(params: {
    index: number;
    id: string | null;
    name: string | null;
    argumentsDelta: string | null;
    providerMetadata?: ProviderMetadata;
  }) {
    this.index = params.index;
    this.id = params.id;
    this.name = params.name;
    this.argumentsDelta = params.argumentsDelta;
    this.providerMetadata = params.providerMetadata ?? null;
  }
}

export class StreamInferenceResponseChunk {
  public readonly thinkingDelta: string | null;
  public readonly thinkingId: string | null;
  public readonly thinkingSignature: string | null;
  public readonly textContentDelta: string | null;
  public readonly textProviderMetadata: ProviderMetadata;
  public readonly toolCallsDelta: StreamInferenceResponseChunkToolCall[];
  public readonly finishReason?: string | null;
  public readonly usage?: {
    inputTokens?: number;
    outputTokens?: number;
    /** Prompt tokens served from the provider's prompt cache. */
    cacheReadInputTokens?: number;
    /** Prompt tokens written to the provider's prompt cache. */
    cacheWriteInputTokens?: number;
  };

  constructor(params: {
    thinkingDelta: string | null;
    thinkingId?: string | null;
    thinkingSignature?: string | null;
    textContentDelta: string | null;
    textProviderMetadata?: ProviderMetadata;
    toolCallsDelta: StreamInferenceResponseChunkToolCall[];
    finishReason?: string | null;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheReadInputTokens?: number;
      cacheWriteInputTokens?: number;
    };
  }) {
    this.thinkingDelta = params.thinkingDelta;
    this.thinkingId = params.thinkingId ?? null;
    this.thinkingSignature = params.thinkingSignature ?? null;
    this.textContentDelta = params.textContentDelta;
    this.textProviderMetadata = params.textProviderMetadata ?? null;
    this.toolCallsDelta = params.toolCallsDelta;
    this.finishReason = params.finishReason;
    this.usage = params.usage;
  }

  /** Factory: chunk containing only a thinking delta */
  static thinking(delta: string | null): StreamInferenceResponseChunk {
    return new StreamInferenceResponseChunk({
      thinkingDelta: delta,
      textContentDelta: null,
      toolCallsDelta: [],
    });
  }

  /** Factory: chunk containing only a text content delta */
  static text(delta: string | null): StreamInferenceResponseChunk {
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: delta,
      toolCallsDelta: [],
    });
  }
}
