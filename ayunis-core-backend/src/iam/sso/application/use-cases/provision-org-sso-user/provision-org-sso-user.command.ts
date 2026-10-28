import type { ValidatedOrgOidcIdentity } from 'src/iam/sso/application/models/validated-org-oidc-identity';

export class ProvisionOrgSsoUserCommand {
  constructor(public readonly login: ValidatedOrgOidcIdentity) {}
}
