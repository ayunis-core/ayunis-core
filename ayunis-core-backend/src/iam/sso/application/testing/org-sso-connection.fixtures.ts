import type { UUID } from 'crypto';
import { Org } from 'src/iam/orgs/domain/org.entity';
import type { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

export const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
export const OTHER_ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;

export function anOrgSsoConnection(
  overrides: Partial<ConstructorParameters<typeof OrgSsoConnection>[0]> = {},
): OrgSsoConnection {
  return new OrgSsoConnection({
    orgId: TEST_ORG_ID,
    emailDomain: 'stadt.example',
    domainVerifiedAt: new Date('2026-08-11T10:00:00.000Z'),
    zitadelOrgId: 'zitadel-org-1',
    ...overrides,
  });
}

export function anOrg(id: UUID = TEST_ORG_ID): Org {
  return new Org({ id, name: 'Test Municipality' });
}

export function createMockOrgSsoConnectionsRepository(): jest.Mocked<OrgSsoConnectionsRepository> {
  return {
    findByOrgId: jest.fn().mockResolvedValue(null),
    findByEmailDomain: jest.fn().mockResolvedValue(null),
    findByZitadelOrgId: jest.fn().mockResolvedValue(null),
    save: jest
      .fn()
      .mockImplementation((connection) => Promise.resolve(connection)),
    updateConfigurationIfDisabled: jest
      .fn()
      .mockImplementation((connection: OrgSsoConnection) =>
        Promise.resolve(connection),
      ),
    setEnabled: jest
      .fn()
      .mockImplementation((connection: OrgSsoConnection, enabled: boolean) =>
        Promise.resolve(anOrgSsoConnection({ ...connection, enabled })),
      ),
    setJitProvisioningEnabled: jest
      .fn()
      .mockImplementation((orgId: UUID, enabled: boolean) =>
        Promise.resolve(
          anOrgSsoConnection({ orgId, jitProvisioningEnabled: enabled }),
        ),
      ),
    setJitProvisioningEnabledIfMappingMatches: jest
      .fn()
      .mockImplementation((expected: OrgSsoConnection, enabled: boolean) =>
        Promise.resolve(
          anOrgSsoConnection({
            ...expected,
            jitProvisioningEnabled: enabled,
          }),
        ),
      ),
  };
}
