import type { UUID } from 'crypto';

export class GetThreadAiContextQuery {
  constructor(public readonly threadId: UUID) {}
}
