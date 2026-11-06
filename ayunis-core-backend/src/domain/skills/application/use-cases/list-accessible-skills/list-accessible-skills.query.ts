import type { SkillListScope } from 'src/domain/skills/application/models/skill-owner';

export class ListAccessibleSkillsQuery {
  public readonly owner: SkillListScope;
  public readonly search?: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(params: {
    owner: SkillListScope;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    this.owner = params.owner;
    this.search = params.search?.trim() || undefined;
    this.limit = params.limit;
    this.offset = params.offset;
  }
}
