import { UUID } from 'crypto';

export class CreateThreadCommand {
  modelId?: UUID;
  agentId?: UUID;
  title?: string;
  instruction?: string;

  constructor(params: {
    modelId?: UUID;
    agentId?: UUID;
    title?: string;
    instruction?: string;
  }) {
    this.modelId = params.modelId;
    this.agentId = params.agentId;
    this.title = params.title;
    this.instruction = params.instruction;
  }
}
