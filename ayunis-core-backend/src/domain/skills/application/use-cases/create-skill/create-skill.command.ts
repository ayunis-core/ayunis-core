export class CreateSkillCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
  }
}
