import type { UUID } from 'crypto';

export class FindContentChunksByIdsQuery {
  constructor(public readonly chunkIds: UUID[]) {}
}
