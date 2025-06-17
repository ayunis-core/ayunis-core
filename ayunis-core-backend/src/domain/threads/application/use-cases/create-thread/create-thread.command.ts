import { UUID } from 'crypto';

export class CreateThreadCommand {
  userId: UUID;
  orgId: UUID;
  modelId: UUID;
  title?: string;
  instruction?: string;

  constructor(params: {
    userId: UUID;
    orgId: UUID;
    modelId: UUID;
    title?: string;
    instruction?: string;
  }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.modelId = params.modelId;
    this.title = params.title;
    this.instruction = params.instruction;
  }
}
