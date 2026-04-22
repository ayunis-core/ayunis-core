import type { UUID } from 'crypto';

export class FindUsersByIdsQuery {
  constructor(public readonly ids: UUID[]) {}
}
