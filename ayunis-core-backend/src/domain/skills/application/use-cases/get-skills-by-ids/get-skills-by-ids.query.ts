import type { UUID } from 'crypto';

export class GetSkillsByIdsQuery {
  constructor(public readonly skillIds: UUID[]) {}
}
