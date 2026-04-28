import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from 'src/domain/tools/domain/tool.entity';
import type { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import type { Model } from '../../domain/model.entity';

export class InferenceInput {
  public readonly model: Model;
  public readonly messages: Message[];
  public readonly systemPrompt?: string;
  /**
   * Tools the LLM can call. Combines persisted `Tool` entities (from agents,
   * skills, MCP integrations) with ad-hoc inline tool definitions supplied
   * by transport-layer callers (the OpenAI-compat endpoint). Both satisfy
   * `ToolSchema`; handlers don't need to distinguish — they just serialize
   * each one to the provider's wire format.
   */
  public readonly tools: ToolSchema[];
  public readonly toolChoice?: ModelToolChoice;
  public readonly orgId: string;

  constructor(params: {
    model: Model;
    messages: Message[];
    systemPrompt?: string;
    tools: ToolSchema[];
    toolChoice: ModelToolChoice;
    orgId: string;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.systemPrompt = params.systemPrompt;
    this.tools = params.tools;
    // only set toolChoice if tools are provided
    this.toolChoice = params.tools.length > 0 ? params.toolChoice : undefined;
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
