import type { UUID } from 'crypto';
import type { ValidatedOidcIdentity } from 'src/iam/sso/application/ports/oidc-broker.client';

export interface ValidatedOrgOidcIdentity extends ValidatedOidcIdentity {
  orgId: UUID;
}
