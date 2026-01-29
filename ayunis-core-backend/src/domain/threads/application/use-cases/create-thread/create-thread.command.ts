import { UUID } from 'crypto';

export class CreateThreadCommand {
  permittedModelId?: UUID;
  agentId?: UUID;
  title?: string;
  instruction?: string;
  isAnonymous?: boolean;

  constructor(params: {
    permittedModelId?: UUID;
    agentId?: UUID;
    title?: string;
    instruction?: string;
    isAnonymous?: boolean;
  }) {
    this.permittedModelId = params.permittedModelId;
    this.agentId = params.agentId;
    this.title = params.title;
    this.instruction = params.instruction;
    this.isAnonymous = params.isAnonymous;
  }
}
