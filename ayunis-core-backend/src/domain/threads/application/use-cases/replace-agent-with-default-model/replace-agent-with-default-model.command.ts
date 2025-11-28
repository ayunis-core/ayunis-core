import { UUID } from 'crypto';

export class ReplaceAgentWithDefaultModelCommand {
  oldAgentId: UUID;
  excludeUserId?: UUID;

  constructor(params: { oldAgentId: UUID; excludeUserId?: UUID }) {
    this.oldAgentId = params.oldAgentId;
    this.excludeUserId = params.excludeUserId;
  }
}
