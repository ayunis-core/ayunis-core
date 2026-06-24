import type { UUID } from 'crypto';

export class MarketplaceIntegrationInstalledEvent {
  static readonly EVENT_NAME = 'marketplace.integration-installed';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly identifier: string,
  ) {}
}
