import { UUID } from 'crypto';

export class ReplaceAgentWithDefaultModelCommand {
  oldAgentId: UUID;

  constructor(params: { oldAgentId: UUID }) {
    this.oldAgentId = params.oldAgentId;
  }
}
