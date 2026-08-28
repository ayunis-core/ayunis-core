import type { UUID } from 'crypto';

export class ConfigureOrgSsoConnectionCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly emailDomains: string[],
    public readonly zitadelOrgId: string,
    public readonly zitadelIdpId: string | null | undefined = undefined,
  ) {}
}
