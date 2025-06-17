import { Tool } from '../../../../tools/domain/tool.entity';
import { ModelToolChoice } from '../../enums/model-tool-choice.enum';
import { Message } from 'src/domain/messages/domain/message.entity';
import { Model } from 'src/domain/models/domain/model.entity';

export class GetInferenceCommand {
  model: Model;
  messages: Message[];
  tools: Tool[];
  toolChoice: ModelToolChoice;
  instructions?: string;

  constructor(params: {
    model: Model;
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
