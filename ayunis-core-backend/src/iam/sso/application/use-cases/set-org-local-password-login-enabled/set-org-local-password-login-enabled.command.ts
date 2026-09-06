import type { UUID } from 'crypto';
import type { ReviewedSsoMapping } from 'src/iam/sso/application/models/reviewed-sso-mapping';

export class SetOrgLocalPasswordLoginEnabledCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly enabled: boolean,
    public readonly reviewedMapping?: ReviewedSsoMapping,
  ) {}
}
