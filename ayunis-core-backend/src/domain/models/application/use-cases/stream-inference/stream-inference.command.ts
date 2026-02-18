import type { Message } from 'src/domain/messages/domain/message.entity';

import type { ModelToolChoice } from '../../../domain/value-objects/model-tool-choice.enum';
import type { Model } from 'src/domain/models/domain/model.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';

export class StreamInferenceCommand {
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
