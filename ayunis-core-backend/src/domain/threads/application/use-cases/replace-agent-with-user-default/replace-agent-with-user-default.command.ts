import { UUID } from 'crypto';

export class ReplaceAgentWithUserDefaultCommand {
  oldAgentId: UUID;

  constructor(params: { oldAgentId: UUID }) {
    this.oldAgentId = params.oldAgentId;
  }
}
