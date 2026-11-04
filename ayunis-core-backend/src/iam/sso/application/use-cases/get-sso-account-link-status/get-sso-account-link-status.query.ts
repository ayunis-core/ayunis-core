import type { UUID } from 'crypto';

export class GetSsoAccountLinkStatusQuery {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
