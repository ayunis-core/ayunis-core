import type { UUID } from 'crypto';

export class FindThreadQuery {
  constructor(public readonly id: UUID) {}
}
