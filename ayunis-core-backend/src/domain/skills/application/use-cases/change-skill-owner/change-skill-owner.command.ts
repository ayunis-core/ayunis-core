import type { UUID } from 'crypto';
import type { SkillTransferOwner } from 'src/domain/skills/application/models/skill-owner';

export class ChangeSkillOwnerCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly owner: SkillTransferOwner,
  ) {}
}
