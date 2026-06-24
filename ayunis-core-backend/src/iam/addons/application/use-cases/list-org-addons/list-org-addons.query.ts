import type { UUID } from 'crypto';

export class ListOrgAddonsQuery {
  constructor(public readonly orgId: UUID) {}
}
