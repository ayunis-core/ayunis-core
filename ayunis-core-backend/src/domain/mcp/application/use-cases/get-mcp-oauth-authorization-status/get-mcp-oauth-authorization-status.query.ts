import type { UUID } from 'crypto';

export class GetMcpOAuthAuthorizationStatusQuery {
  constructor(public readonly integrationId: UUID) {}
}
