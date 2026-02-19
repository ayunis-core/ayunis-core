import type { UUID } from 'crypto';

export class RemoveSkillSourcesFromThreadsCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly userIds: UUID[],
  ) {}
}
