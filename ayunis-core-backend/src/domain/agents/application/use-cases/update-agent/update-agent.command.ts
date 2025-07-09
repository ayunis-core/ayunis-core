import { UUID } from 'crypto';

export class UpdateAgentCommand {
  constructor(
    public readonly agentId: UUID,
    public readonly name: string,
    public readonly instructions: string,
    public readonly modelId: UUID,
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
