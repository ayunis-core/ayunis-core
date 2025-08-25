import { UUID } from 'crypto';
import { Agent } from '../../../domain/agent.entity';

export class RemoveSourceFromAgentCommand {
  constructor(
    public readonly agent: Agent,
    public readonly sourceId: UUID,
  ) {}
}