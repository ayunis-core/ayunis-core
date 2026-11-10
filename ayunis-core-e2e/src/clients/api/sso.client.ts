import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from './generated-api';

/** Turns on SSO for an organization; `superAdminApi` is a super admin. */
export async function enableOrgSso(
  superAdminApi: APIRequestContext,
  orgId: string,
  domain: string,
  zitadelOrgId: string,
): Promise<void> {
  await generatedApi.superAdminSsoConnectionsControllerConfigure(
    orgId,
    { emailDomains: [domain], zitadelOrgId, domainVerified: true },
    { api: superAdminApi },
  );
  await generatedApi.superAdminSsoConnectionsControllerSetEnabled(
    orgId,
    {
      enabled: true,
      confirmed: true,
      reviewedEmailDomains: [domain],
      reviewedZitadelOrgId: zitadelOrgId,
    },
    { api: superAdminApi },
  );
}
