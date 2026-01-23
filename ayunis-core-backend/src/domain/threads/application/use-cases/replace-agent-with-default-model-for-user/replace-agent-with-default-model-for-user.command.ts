import { UUID } from 'crypto';

export class ReplaceAgentWithDefaultModelForUserCommand {
  agentId: UUID;
  userId: UUID;

  constructor(params: { agentId: UUID; userId: UUID }) {
    this.agentId = params.agentId;
    this.userId = params.userId;
  }
}
