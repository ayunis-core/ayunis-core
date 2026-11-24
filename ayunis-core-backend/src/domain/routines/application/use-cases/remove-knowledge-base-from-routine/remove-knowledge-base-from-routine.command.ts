import type { UUID } from 'crypto';

export class RemoveKnowledgeBaseFromRoutineCommand {
  constructor(
    public readonly routineId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
