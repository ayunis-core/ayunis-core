import type { UUID } from 'crypto';

export class SetOrgSsoIdpCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly zitadelIdpId: string | null,
  ) {}
}
