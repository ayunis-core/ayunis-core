import { Message } from 'src/domain/messages/domain/message.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { Model } from '../../domain/model.entity';
import { Observable } from 'rxjs';

export class StreamInferenceInput {
  public readonly model: Model;
  public readonly messages: Message[];
  public readonly systemPrompt: string;
  public readonly tools: Tool[];
  public readonly toolChoice?: ModelToolChoice;

  constructor(params: {
    model: Model;
    messages: Message[];
    systemPrompt: string;
    tools?: Tool[];
    toolChoice?: ModelToolChoice;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.systemPrompt = params.systemPrompt;
    this.tools = params.tools || [];
    // only set toolChoice if tools are provided
    this.toolChoice =
      params.tools && params.tools.length > 0 ? params.toolChoice : undefined;
  }
}

export class StreamInferenceResponseChunkToolCall {
  public readonly index: number;
  public readonly id: string | null;
  public readonly name: string | null;
  public readonly argumentsDelta: string | null;

  constructor(params: {
    index: number;
    id: string | null;
    name: string | null;
    argumentsDelta: string | null;
  }) {
    this.index = params.index;
    this.id = params.id;
    this.name = params.name;
    this.argumentsDelta = params.argumentsDelta;
  }
}

export class StreamInferenceResponseChunk {
  public readonly textContentDelta: string | null;
  public readonly toolCallsDelta: StreamInferenceResponseChunkToolCall[];
  public readonly finishReason?: string | null;
  public readonly usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };

  constructor(params: {
    textContentDelta: string | null;
    toolCallsDelta: StreamInferenceResponseChunkToolCall[];
    finishReason?: string | null;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
  }) {
    this.textContentDelta = params.textContentDelta;
    this.toolCallsDelta = params.toolCallsDelta;
    this.finishReason = params.finishReason;
    this.usage = params.usage;
  }
}

export abstract class StreamInferenceHandler {
  abstract answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk>;
}
