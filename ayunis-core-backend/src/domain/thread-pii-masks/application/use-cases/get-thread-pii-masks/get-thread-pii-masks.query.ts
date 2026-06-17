import type { UUID } from 'crypto';

export class GetThreadPiiMasksQuery {
  constructor(public readonly threadId: UUID) {}
}
