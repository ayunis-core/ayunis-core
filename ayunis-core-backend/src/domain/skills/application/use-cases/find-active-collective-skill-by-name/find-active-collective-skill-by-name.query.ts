export class FindActiveCollectiveSkillByNameQuery {
  constructor(
    public readonly name: string,
    public readonly ownerType: 'team' | 'org',
  ) {}
}
