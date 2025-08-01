import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { Tool } from '../../../../tools/domain/tool.entity';
import { ModelToolChoice } from '../../../domain/value-objects/model-tool-choice.enum';
import { Message } from 'src/domain/messages/domain/message.entity';

export class GetInferenceCommand {
  model: LanguageModel;
  messages: Message[];
  tools: Tool[];
  toolChoice: ModelToolChoice;
  instructions?: string;

  constructor(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
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
