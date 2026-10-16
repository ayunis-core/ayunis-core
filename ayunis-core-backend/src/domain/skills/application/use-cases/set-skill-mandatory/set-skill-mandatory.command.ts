import type { UUID } from 'crypto';

export class SetSkillMandatoryCommand {
  constructor(
    readonly skillId: UUID,
    readonly isMandatory: boolean,
  ) {}
}
