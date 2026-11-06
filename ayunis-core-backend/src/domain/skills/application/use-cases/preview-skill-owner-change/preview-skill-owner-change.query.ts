import type { UUID } from 'crypto';
import type { SkillTransferOwner } from 'src/domain/skills/application/models/skill-owner';

export class PreviewSkillOwnerChangeQuery {
  constructor(
    public readonly skillId: UUID,
    public readonly owner: SkillTransferOwner,
  ) {}
}
