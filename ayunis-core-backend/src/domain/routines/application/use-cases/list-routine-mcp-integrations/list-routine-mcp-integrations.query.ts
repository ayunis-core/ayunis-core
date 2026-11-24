import type { UUID } from 'crypto';

export class ListRoutineMcpIntegrationsQuery {
  constructor(public readonly routineId: UUID) {}
}
