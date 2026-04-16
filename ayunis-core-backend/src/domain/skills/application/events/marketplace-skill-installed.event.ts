import type { UUID } from 'crypto';

export class MarketplaceSkillInstalledEvent {
  static readonly EVENT_NAME = 'marketplace.skill-installed';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly identifier: string,
  ) {}
}
