import { UUID } from 'crypto';

export class RemoveSourceFromAgentCommand {
  public readonly agentId: UUID;
  public readonly sourceAssignmentId: UUID;

  constructor(params: { agentId: UUID; sourceAssignmentId: UUID }) {
    this.agentId = params.agentId;
    this.sourceAssignmentId = params.sourceAssignmentId;
  }
}
