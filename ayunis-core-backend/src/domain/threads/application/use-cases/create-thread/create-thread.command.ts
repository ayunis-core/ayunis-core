import type { UUID } from 'crypto';

export class CreateThreadCommand {
  modelId?: UUID;
  agentId?: UUID;
  title?: string;
  instruction?: string;
  isAnonymous?: boolean;

  constructor(params: {
    modelId?: UUID;
    agentId?: UUID;
    title?: string;
    instruction?: string;
    isAnonymous?: boolean;
  }) {
    this.modelId = params.modelId;
    this.agentId = params.agentId;
    this.title = params.title;
    this.instruction = params.instruction;
    this.isAnonymous = params.isAnonymous;
  }
}
