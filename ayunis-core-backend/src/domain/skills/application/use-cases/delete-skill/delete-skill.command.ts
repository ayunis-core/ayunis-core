import type { UUID } from 'crypto';

export class DeleteSkillCommand {
  constructor(public readonly skillId: UUID) {}
}
