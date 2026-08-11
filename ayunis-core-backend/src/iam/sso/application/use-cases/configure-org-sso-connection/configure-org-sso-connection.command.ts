import type { UUID } from 'crypto';

export class ConfigureOrgSsoConnectionCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly emailDomain: string,
    public readonly zitadelOrgId: string,
  ) {}
}
