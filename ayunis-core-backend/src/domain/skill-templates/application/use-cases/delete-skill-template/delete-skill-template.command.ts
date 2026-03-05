import type { UUID } from 'crypto';

export class DeleteSkillTemplateCommand {
  public readonly skillTemplateId: UUID;

  constructor(params: { skillTemplateId: UUID }) {
    this.skillTemplateId = params.skillTemplateId;
  }
}
