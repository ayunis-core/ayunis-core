import type { UUID } from 'crypto';

export enum SkillTextField {
  TRIGGER = 'trigger',
  INSTRUCTIONS = 'instructions',
}

export class ImproveSkillTextCommand {
  public readonly field: SkillTextField;
  public readonly name?: string;
  public readonly language?: 'en' | 'de';
  public readonly trigger: string;
  public readonly instructions: string;
  public readonly consumeTrialMessage: boolean;
  /** Set when the draft belongs to a skill of this workspace. */
  public readonly workspaceId?: UUID;

  constructor(params: {
    field: SkillTextField;
    name?: string;
    language?: 'en' | 'de';
    trigger: string;
    instructions: string;
    consumeTrialMessage: boolean;
    workspaceId?: UUID;
  }) {
    this.field = params.field;
    this.name = params.name;
    this.language = params.language;
    this.trigger = params.trigger;
    this.instructions = params.instructions;
    this.consumeTrialMessage = params.consumeTrialMessage;
    this.workspaceId = params.workspaceId;
  }
}
