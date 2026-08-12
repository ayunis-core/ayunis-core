import type { UUID } from 'crypto';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

export const SSO_TEST_ORG_ID =
  'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;
export const SSO_TEST_ZITADEL_ORG_ID = '385820595704561666';

export function anEnabledSsoConnection(
  overrides: Partial<OrgSsoConnection> = {},
): OrgSsoConnection {
  return new OrgSsoConnection({
    orgId: SSO_TEST_ORG_ID,
    emailDomain: 'demo.com',
    domainVerifiedAt: new Date('2026-08-12T09:00:00.000Z'),
    zitadelOrgId: SSO_TEST_ZITADEL_ORG_ID,
    enabled: true,
    ...overrides,
  });
}
