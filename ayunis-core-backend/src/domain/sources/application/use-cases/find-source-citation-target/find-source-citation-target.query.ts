import type { UUID } from 'crypto';

export class FindSourceCitationTargetQuery {
  constructor(public readonly chunkId: UUID) {}
}
