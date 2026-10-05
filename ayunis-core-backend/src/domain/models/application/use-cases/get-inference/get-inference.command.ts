import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import type { InferenceCallTerminalHandler } from 'src/domain/models/application/models/inference-call-terminal';

export class GetInferenceCommand {
  model: LanguageModel;
  messages: Message[];
  tools: ToolSchema[];
  toolChoice: ModelToolChoice;
  instructions?: string;
  acceptTokenLimitCompletion: boolean;
  onCallTerminal?: InferenceCallTerminalHandler;

  constructor(params: {
    model: LanguageModel;
    messages: Message[];
    tools: ToolSchema[];
    toolChoice: ModelToolChoice;
    instructions?: string;
    acceptTokenLimitCompletion?: boolean;
    onCallTerminal?: InferenceCallTerminalHandler;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.tools = params.tools;
    this.toolChoice = params.toolChoice;
    this.instructions = params.instructions;
    this.acceptTokenLimitCompletion =
      params.acceptTokenLimitCompletion ?? false;
    this.onCallTerminal = params.onCallTerminal;
  }
}
