import type { UUID } from 'crypto';

export class FindOneSkillTemplateQuery {
  constructor(public readonly id: UUID) {}
}
