import type { UUID } from 'crypto';

export class FindAllUserSummariesByOrgIdQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly search?: string,
  ) {}
}
