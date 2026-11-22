import type { UUID } from 'crypto';

export class FinishLocationSyncCommand {
  constructor(public readonly locationId: UUID) {}
}
