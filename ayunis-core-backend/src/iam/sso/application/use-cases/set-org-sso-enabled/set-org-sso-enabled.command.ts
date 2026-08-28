import type { UUID } from 'crypto';

export interface ReviewedSsoMapping {
  emailDomains: string[];
  zitadelOrgId: string;
}

export class SetOrgSsoEnabledCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly enabled: boolean,
    public readonly reviewedMapping?: ReviewedSsoMapping,
  ) {}
}
