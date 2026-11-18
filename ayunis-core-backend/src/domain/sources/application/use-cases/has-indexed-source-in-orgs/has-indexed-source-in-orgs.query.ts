import type { UUID } from 'crypto';

export class HasIndexedSourceInOrgsQuery {
  constructor(public readonly orgIds: UUID[]) {}
}
