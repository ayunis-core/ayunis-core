import type { UUID } from 'crypto';

export class UpdateSkillCommand {
  public readonly skillId: UUID;
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;

  constructor(params: {
    skillId: UUID;
    name: string;
    shortDescription: string;
    instructions: string;
  }) {
    this.skillId = params.skillId;
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
  }
}
