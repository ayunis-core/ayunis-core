import type { UUID } from 'crypto';
import type { SkillOwner } from 'src/domain/skills/application/models/skill-owner';

export class CreateSkillCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly isActive?: boolean;
  public readonly owner: SkillOwner;
  public readonly mcpIntegrationIds?: UUID[];

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    owner: SkillOwner;
    isActive?: boolean;
    mcpIntegrationIds?: UUID[];
  }) {
    Object.assign(this, params);
  }
}
