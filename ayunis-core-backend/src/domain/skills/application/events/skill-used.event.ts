import type { UUID } from 'crypto';

export class SkillUsedEvent {
  static readonly EVENT_NAME = 'skill.used';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly skillId: UUID,
    public readonly skillName: string,
  ) {}
}
