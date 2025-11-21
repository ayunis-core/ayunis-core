import { UUID } from 'crypto';

/**
 * Base command for creating shares
 * Shares are always scoped to the organization (derived from context)
 */
export abstract class CreateShareCommand {}

/**
 * Command for creating agent shares
 * The share will be automatically scoped to the user's organization
 */
export class CreateAgentShareCommand extends CreateShareCommand {
  readonly agentId: UUID;

  constructor(agentId: UUID) {
    super();
    this.agentId = agentId;
  }
}
