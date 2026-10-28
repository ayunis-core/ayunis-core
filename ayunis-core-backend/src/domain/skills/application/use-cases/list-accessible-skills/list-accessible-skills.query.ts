import type { SkillOwner } from 'src/domain/skills/application/models/skill-owner';

export class ListAccessibleSkillsQuery {
  public readonly owner: SkillOwner;
  public readonly search?: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(params: {
    owner: SkillOwner;
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
