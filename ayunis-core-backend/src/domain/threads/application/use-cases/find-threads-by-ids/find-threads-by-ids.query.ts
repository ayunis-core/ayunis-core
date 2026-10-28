import type { UUID } from 'crypto';

export class FindThreadsByIdsQuery {
  constructor(
    public readonly userId: UUID,
    public readonly ids: UUID[],
  ) {}
}
