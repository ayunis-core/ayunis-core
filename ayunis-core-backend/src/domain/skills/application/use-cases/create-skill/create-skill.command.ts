export class CreateSkillCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly isActive?: boolean;

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    isActive?: boolean;
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.isActive = params.isActive;
  }
}
