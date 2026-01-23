import { UUID } from 'crypto';

/**
 * Base command for creating shares
 */
export abstract class CreateShareCommand {}

/**
 * Command for creating org-scoped agent shares
 * The share will be automatically scoped to the user's organization
 */
export class CreateOrgAgentShareCommand extends CreateShareCommand {
  readonly agentId: UUID;

  constructor(agentId: UUID) {
    super();
    this.agentId = agentId;
  }
}

/**
 * Command for creating team-scoped agent shares
 * The user must be a member of the specified team
 */
export class CreateTeamAgentShareCommand extends CreateShareCommand {
  readonly agentId: UUID;
  readonly teamId: UUID;

  constructor(agentId: UUID, teamId: UUID) {
    super();
    this.agentId = agentId;
    this.teamId = teamId;
  }
}
