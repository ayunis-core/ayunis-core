export enum SkillTextField {
  TRIGGER = 'trigger',
  INSTRUCTIONS = 'instructions',
}

export class ImproveSkillTextCommand {
  public readonly field: SkillTextField;
  public readonly name?: string;
  public readonly trigger: string;
  public readonly instructions: string;

  constructor(params: {
    field: SkillTextField;
    name?: string;
    trigger: string;
    instructions: string;
  }) {
    this.field = params.field;
    this.name = params.name;
    this.trigger = params.trigger;
    this.instructions = params.instructions;
  }
}
