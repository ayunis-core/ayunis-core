import type { UUID } from 'crypto';

export class GetMcpIntegrationQuery {
  constructor(public readonly integrationId: UUID) {}
}
