import { UUID } from 'crypto';

export class DeleteAgentCommand {
  agentId: UUID;

  constructor(params: { agentId: UUID }) {
    this.agentId = params.agentId;
  }
}
