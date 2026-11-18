import type { UUID } from 'crypto';

export class SyncLocationCommand {
  constructor(public readonly locationId: UUID) {}
}
