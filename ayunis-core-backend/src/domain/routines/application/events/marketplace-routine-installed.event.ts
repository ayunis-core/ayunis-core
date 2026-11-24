import type { UUID } from 'crypto';

export class MarketplaceRoutineInstalledEvent {
  static readonly EVENT_NAME = 'marketplace.routine-installed';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly identifier: string,
  ) {}
}
