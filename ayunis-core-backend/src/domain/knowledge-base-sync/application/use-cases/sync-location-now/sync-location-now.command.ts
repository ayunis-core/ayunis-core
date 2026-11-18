import type { UUID } from 'crypto';

export class SyncLocationNowCommand {
  constructor(public readonly locationId: UUID) {}
}
