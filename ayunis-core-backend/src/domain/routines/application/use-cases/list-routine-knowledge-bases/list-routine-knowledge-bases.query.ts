import type { UUID } from 'crypto';

export class ListRoutineKnowledgeBasesQuery {
  constructor(public readonly routineId: UUID) {}
}
