import type { UUID } from 'crypto';

export class FindRoutineQuery {
  constructor(public readonly id: UUID) {}
}
