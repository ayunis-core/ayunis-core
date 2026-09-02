export interface UpdateSubscriptionStartDateFormData {
  startsAt: string;
}

export interface UpdateOrgNameFormData {
  name: string;
}

export interface SsoConnectionFormFields {
  emailDomains: Array<{ value: string }>;
  zitadelOrgId: string;
  zitadelIdpId: string;
  domainVerified: boolean;
}
