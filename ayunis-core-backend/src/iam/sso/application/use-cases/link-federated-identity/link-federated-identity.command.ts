import type { UUID } from 'crypto';
import type { ValidatedOrgOidcIdentity } from 'src/iam/sso/application/models/validated-org-oidc-identity';

export class LinkFederatedIdentityCommand {
  constructor(
    public readonly userId: UUID,
    public readonly identity: ValidatedOrgOidcIdentity,
  ) {}
}
