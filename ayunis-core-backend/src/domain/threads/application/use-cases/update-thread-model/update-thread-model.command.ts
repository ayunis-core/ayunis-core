import { UUID } from 'crypto';

export class UpdateThreadModelCommand {
  threadId: UUID;
  modelId: UUID;

  constructor(params: { threadId: UUID; modelId: UUID }) {
    this.threadId = params.threadId;
    this.modelId = params.modelId;
  }
}
