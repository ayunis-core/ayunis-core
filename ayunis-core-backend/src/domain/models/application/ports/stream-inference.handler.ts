import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { Model } from '../../domain/model.entity';
import type { Observable } from 'rxjs';
import type { ProviderMetadata } from 'src/domain/messages/domain/message-contents/provider-metadata.type';

export class StreamInferenceInput {
  public readonly model: Model;
  public readonly messages: Message[];
  public readonly systemPrompt: string;
  public readonly tools: Tool[];
  public readonly toolChoice?: ModelToolChoice;
  public readonly orgId: string;

  constructor(params: {
    model: Model;
    messages: Message[];
    systemPrompt: string;
    tools?: Tool[];
    toolChoice?: ModelToolChoice;
    orgId: string;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.systemPrompt = params.systemPrompt;
    this.tools = params.tools ?? [];
    // only set toolChoice if tools are provided
    this.toolChoice =
      params.tools && params.tools.length > 0 ? params.toolChoice : undefined;
    this.orgId = params.orgId;
  }
}

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

  /** Factory: empty chunk (no content, no tool calls) */
  static empty(): StreamInferenceResponseChunk {
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
    });
  }
}

export abstract class StreamInferenceHandler {
  abstract answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk>;
}
