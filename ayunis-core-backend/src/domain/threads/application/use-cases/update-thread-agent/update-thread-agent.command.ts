import { UUID } from 'crypto';

export class UpdateThreadAgentCommand {
  threadId: UUID;
  agentId: UUID;
  userId: UUID;

  constructor(params: { threadId: UUID; agentId: UUID; userId: UUID }) {
    this.threadId = params.threadId;
    this.agentId = params.agentId;
    this.userId = params.userId;
  }
}
