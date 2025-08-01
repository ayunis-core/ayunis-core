import { UUID } from 'crypto';

export class UpdateThreadModelCommand {
  threadId: UUID;
  userId: UUID;
  modelId: UUID;
  orgId: UUID;

  constructor(params: {
    threadId: UUID;
    userId: UUID;
    modelId: UUID;
    orgId: UUID;
  }) {
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.modelId = params.modelId;
    this.orgId = params.orgId;
  }
}
