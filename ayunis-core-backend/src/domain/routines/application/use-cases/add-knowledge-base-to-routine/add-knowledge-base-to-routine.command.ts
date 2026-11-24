import type { UUID } from 'crypto';

export class AddKnowledgeBaseToRoutineCommand {
  constructor(
    public readonly routineId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
