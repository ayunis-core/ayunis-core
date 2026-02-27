import type { UUID } from 'crypto';

export class RemoveKbAssignmentsByOriginSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly userIds: UUID[],
  ) {}
}
