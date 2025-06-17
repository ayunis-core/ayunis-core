import { UUID } from 'crypto';

export class DeleteAgentCommand {
  constructor(
    public readonly agentId: UUID,
    public readonly userId: UUID,
  ) {}
}
