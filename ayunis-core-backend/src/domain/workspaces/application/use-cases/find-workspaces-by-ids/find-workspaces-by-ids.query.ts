import type { UUID } from 'crypto';

export class FindWorkspacesByIdsQuery {
  constructor(
    public readonly userId: UUID,
    public readonly ids: UUID[],
  ) {}
}
