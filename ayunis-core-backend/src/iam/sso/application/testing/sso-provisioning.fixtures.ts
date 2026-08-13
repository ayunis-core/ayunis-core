import type { UUID } from 'crypto';
import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';

export const SSO_TEST_ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;
export const SSO_TEST_USER_ID = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;
export const SSO_TEST_ISSUER = 'https://sso.ayunis.de';
export const SSO_TEST_SUBJECT = '385820595704562041';

export function aFederatedIdentity(
  overrides: Partial<FederatedIdentity> = {},
): FederatedIdentity {
  return new FederatedIdentity({
    issuer: SSO_TEST_ISSUER,
    subject: SSO_TEST_SUBJECT,
    userId: SSO_TEST_USER_ID,
    ...overrides,
  });
}
