import type { UUID } from 'crypto';

export class SetOrgSsoJitProvisioningCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly enabled: boolean,
  ) {}
}
