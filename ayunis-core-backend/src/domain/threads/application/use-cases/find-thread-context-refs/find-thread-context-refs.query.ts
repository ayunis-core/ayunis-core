import type { UUID } from 'crypto';

export class FindThreadContextRefsQuery {
  constructor(public readonly threadId: UUID) {}
}
