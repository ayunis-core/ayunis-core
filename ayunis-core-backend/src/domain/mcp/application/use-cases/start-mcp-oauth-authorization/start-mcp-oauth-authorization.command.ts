import type { UUID } from 'crypto';

export class StartMcpOAuthAuthorizationCommand {
  constructor(
    public readonly integrationId: UUID,
    public readonly frontendRedirectPath: string | null,
  ) {}
}
