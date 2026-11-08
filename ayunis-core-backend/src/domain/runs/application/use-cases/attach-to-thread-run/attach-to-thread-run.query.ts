import type { UUID } from 'crypto';

export class AttachToThreadRunQuery {
  constructor(public readonly threadId: UUID) {}
}
