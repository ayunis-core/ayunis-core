import type { UUID } from 'crypto';

export class RevokeMcpOAuthAuthorizationCommand {
  constructor(public readonly integrationId: UUID) {}
}
