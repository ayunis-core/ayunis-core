import { UUID } from 'crypto';

export class FindOneSkillQuery {
  constructor(public readonly id: UUID) {}
}
