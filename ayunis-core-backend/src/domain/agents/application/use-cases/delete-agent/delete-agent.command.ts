import { UUID } from 'crypto';

export class DeleteAgentCommand {
  agentId: UUID;
  userId: UUID;
  orgId: UUID;

  constructor(params: { agentId: UUID; userId: UUID; orgId: UUID }) {
    this.agentId = params.agentId;
    this.userId = params.userId;
    this.orgId = params.orgId;
  }
}
