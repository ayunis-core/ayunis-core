import type { UUID } from 'crypto';

export class DescribeTeamsQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly teamIds: UUID[],
  ) {}
}
