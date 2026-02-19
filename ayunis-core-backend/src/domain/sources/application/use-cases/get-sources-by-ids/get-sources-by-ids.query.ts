import type { UUID } from 'crypto';

export class GetSourcesByIdsQuery {
  constructor(public readonly sourceIds: UUID[]) {}
}
