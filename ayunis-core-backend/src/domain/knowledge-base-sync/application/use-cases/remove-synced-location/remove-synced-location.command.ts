import type { UUID } from 'crypto';

export class RemoveSyncedLocationCommand {
  constructor(public readonly locationId: UUID) {}
}
