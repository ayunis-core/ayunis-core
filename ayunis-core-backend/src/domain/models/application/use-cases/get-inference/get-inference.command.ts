import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { ModelToolChoice } from '../../../domain/value-objects/model-tool-choice.enum';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from '../../../domain/value-objects/tool-schema';

export class GetInferenceCommand {
  model: LanguageModel;
  messages: Message[];
  tools: ToolSchema[];
  toolChoice: ModelToolChoice;
  instructions?: string;

  constructor(params: {
    model: LanguageModel;
    messages: Message[];
    tools: ToolSchema[];
    toolChoice: ModelToolChoice;
    instructions?: string;
  }) {
    this.model = params.model;
    this.messages = params.messages;
    this.tools = params.tools;
    this.toolChoice = params.toolChoice;
    this.instructions = params.instructions;
  }
}
