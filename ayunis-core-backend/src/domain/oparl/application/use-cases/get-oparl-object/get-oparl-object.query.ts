import type { UUID } from 'crypto';

export class GetOparlObjectQuery {
  constructor(readonly id: UUID) {}
}
