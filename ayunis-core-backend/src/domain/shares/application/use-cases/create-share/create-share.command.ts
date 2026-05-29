import type { UUID } from 'crypto';

/**
 * Base command for creating shares
 */
export abstract class CreateShareCommand {}

/**
 * Command for creating org-scoped skill shares
 * The share will be automatically scoped to the user's organization
 */
export class CreateOrgSkillShareCommand extends CreateShareCommand {
  readonly skillId: UUID;

  constructor(skillId: UUID) {
    super();
    this.skillId = skillId;
  }
}

/**
 * Command for creating team-scoped skill shares
 * The user must be a member of the specified team
 */
export class CreateTeamSkillShareCommand extends CreateShareCommand {
  readonly skillId: UUID;
  readonly teamId: UUID;

  constructor(skillId: UUID, teamId: UUID) {
    super();
    this.skillId = skillId;
    this.teamId = teamId;
  }
}

/**
 * Command for creating org-scoped knowledge base shares
 * The share will be automatically scoped to the user's organization
 */
export class CreateOrgKnowledgeBaseShareCommand extends CreateShareCommand {
  readonly knowledgeBaseId: UUID;

  constructor(knowledgeBaseId: UUID) {
    super();
    this.knowledgeBaseId = knowledgeBaseId;
  }
}

/**
 * Command for creating team-scoped knowledge base shares
 * The user must be a member of the specified team
 */
export class CreateTeamKnowledgeBaseShareCommand extends CreateShareCommand {
  readonly knowledgeBaseId: UUID;
  readonly teamId: UUID;

  constructor(knowledgeBaseId: UUID, teamId: UUID) {
    super();
    this.knowledgeBaseId = knowledgeBaseId;
    this.teamId = teamId;
  }
}
