import { Message } from 'src/domain/messages/domain/message.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Model } from '../../domain/model.entity';

export class InferenceInput {
  public readonly model: Model;
  public readonly messages: Message[];
  public readonly systemPrompt: string;
  public readonly tools: Tool[];
  public readonly toolChoice?: ModelToolChoice;

  constructor(params: {
    model: Model;
    messages: Message[];
    tools: Tool[];
    toolChoice: ModelToolChoice;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.tools = params.tools;
    // only set toolChoice if tools are provided
    this.toolChoice =
      params.tools && params.tools.length > 0 ? params.toolChoice : undefined;
  }
}

export class InferenceResponse {
  constructor(
    public content: Array<TextMessageContent | ToolUseMessageContent>,
    public meta: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    },
  ) {}
}

export abstract class InferenceHandler {
  abstract answer(input: InferenceInput): Promise<InferenceResponse>;
}
