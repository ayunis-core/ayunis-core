import type { UUID } from 'crypto';

export class SetOrgSsoEnabledCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly enabled: boolean,
  ) {}
}
