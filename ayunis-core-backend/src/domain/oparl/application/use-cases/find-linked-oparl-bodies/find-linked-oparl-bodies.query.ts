import type { UUID } from 'crypto';

export class FindLinkedOparlBodiesQuery {
  constructor(readonly orgId: UUID) {}
}
