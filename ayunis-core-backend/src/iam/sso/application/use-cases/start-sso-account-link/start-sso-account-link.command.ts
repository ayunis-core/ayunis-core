import type { UUID } from 'crypto';

export class StartSsoAccountLinkCommand {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
