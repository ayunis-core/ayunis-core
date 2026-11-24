import type { UUID } from 'crypto';

export class AddMcpIntegrationToRoutineCommand {
  constructor(
    public readonly routineId: UUID,
    public readonly integrationId: UUID,
  ) {}
}
