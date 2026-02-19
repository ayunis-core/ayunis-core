import type { UUID } from 'crypto';

export class EnableMcpIntegrationCommand {
  constructor(public readonly integrationId: UUID) {}
}
