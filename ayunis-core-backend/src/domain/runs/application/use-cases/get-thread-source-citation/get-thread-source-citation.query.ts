import type { UUID } from 'crypto';

export class GetThreadSourceCitationQuery {
  constructor(
    public readonly threadId: UUID,
    public readonly chunkId: UUID,
    public readonly orgId: UUID,
  ) {}
}
