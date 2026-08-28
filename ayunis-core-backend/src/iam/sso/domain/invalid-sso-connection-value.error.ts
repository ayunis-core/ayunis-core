export type SsoConnectionValueField =
  'emailDomain' | 'emailDomains' | 'zitadelOrgId' | 'zitadelIdpId';

export class InvalidSsoConnectionValueError extends Error {
  constructor(public readonly field: SsoConnectionValueField) {
    super(`Invalid SSO connection value: ${field}`);
    this.name = InvalidSsoConnectionValueError.name;
  }
}
