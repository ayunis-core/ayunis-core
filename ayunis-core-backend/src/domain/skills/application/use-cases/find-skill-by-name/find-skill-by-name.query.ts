export type SkillNameScope = 'personal' | 'team' | 'org';

export class FindSkillByNameQuery {
  constructor(
    public readonly name: string,
    public readonly scope: SkillNameScope = 'personal',
  ) {}
}
