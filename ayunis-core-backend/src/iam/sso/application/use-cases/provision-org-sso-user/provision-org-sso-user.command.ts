import type { CompletedOrgSsoLogin } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';

export class ProvisionOrgSsoUserCommand {
  constructor(public readonly login: CompletedOrgSsoLogin) {}
}
