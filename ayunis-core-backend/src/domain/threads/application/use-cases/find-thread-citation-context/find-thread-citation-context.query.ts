import type { UUID } from 'crypto';

export class FindThreadCitationContextQuery {
  constructor(public readonly threadId: UUID) {}
}
