import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import type { Model } from '../../domain/model.entity';

export class InferenceInput {
  public readonly model: Model;
  public readonly messages: Message[];
  public readonly systemPrompt: string;
  public readonly tools: Tool[];
  public readonly toolChoice?: ModelToolChoice;
  public readonly orgId: string;

  constructor(params: {
    model: Model;
    messages: Message[];
    tools: Tool[];
    toolChoice: ModelToolChoice;
    orgId: string;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.tools = params.tools;
    // only set toolChoice if tools are provided
    this.toolChoice =
      params.tools && params.tools.length > 0 ? params.toolChoice : undefined;
    this.orgId = params.orgId;
  }
}

export class InferenceResponse {
  constructor(
    public content: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    >,
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
