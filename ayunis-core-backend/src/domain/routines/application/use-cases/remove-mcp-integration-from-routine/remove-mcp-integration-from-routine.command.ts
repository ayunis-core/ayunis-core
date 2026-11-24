import type { UUID } from 'crypto';

export class RemoveMcpIntegrationFromRoutineCommand {
  constructor(
    public readonly routineId: UUID,
    public readonly integrationId: UUID,
  ) {}
}
