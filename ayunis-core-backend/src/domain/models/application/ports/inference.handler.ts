import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import type { Model } from 'src/domain/models/domain/model.entity';
import type { FinishReason } from '@ayunis/inference';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import type { InferenceCallTerminalHandler } from 'src/domain/models/application/models/inference-call-terminal';

export class InferenceInput {
  public readonly model: Model;
  public readonly messages: Message[];
  public readonly systemPrompt?: string;
  public readonly tools: ToolSchema[];
  public readonly toolChoice?: ModelToolChoice;
  public readonly orgId: string;
  public readonly onCallTerminal?: InferenceCallTerminalHandler;

  constructor(params: {
    model: Model;
    messages: Message[];
    systemPrompt?: string;
    tools: ToolSchema[];
    toolChoice: ModelToolChoice;
    orgId: string;
    onCallTerminal?: InferenceCallTerminalHandler;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.systemPrompt = params.systemPrompt;
    this.tools = params.tools;
    // only set toolChoice if tools are provided
    this.toolChoice = params.tools.length > 0 ? params.toolChoice : undefined;
    this.orgId = params.orgId;
    this.onCallTerminal = params.onCallTerminal;
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
    public finishReason?: FinishReason,
  ) {}
}

export abstract class InferenceHandler {
  abstract answer(input: InferenceInput): Promise<InferenceResponse>;
}
