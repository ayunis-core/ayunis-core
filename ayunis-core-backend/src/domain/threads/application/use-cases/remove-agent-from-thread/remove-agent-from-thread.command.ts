import { UUID } from 'crypto';

export class RemoveAgentFromThreadCommand {
  public readonly threadId: UUID;

  constructor(params: { threadId: UUID }) {
    this.threadId = params.threadId;
  }
}
