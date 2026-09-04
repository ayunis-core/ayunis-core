import type { UUID } from 'crypto';
import { Org } from 'src/iam/orgs/domain/org.entity';
import type {
  OrgSsoConnectionDomainState,
  OrgSsoConnectionsRepository,
} from 'src/iam/sso/application/ports/org-sso-connections.repository';
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

export function anOrgSsoConnectionDomainState(
  connection: OrgSsoConnection,
  hasCanonicalEmailDomains = true,
): OrgSsoConnectionDomainState {
  return { connection, hasCanonicalEmailDomains };
}

function createMappingUpdateMocks() {
  return {
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
    setLocalPasswordLoginEnabledIfMappingMatches: jest
      .fn()
      .mockImplementation((expected: OrgSsoConnection, enabled: boolean) =>
        Promise.resolve(
          anOrgSsoConnection({
            ...expected,
            localPasswordLoginEnabled: enabled,
          }),
        ),
      ),
    setZitadelIdpIdIfMappingMatches: jest
      .fn()
      .mockImplementation(
        (expected: OrgSsoConnection, zitadelIdpId: string | null) =>
          Promise.resolve(anOrgSsoConnection({ ...expected, zitadelIdpId })),
      ),
  };
}

export function createMockOrgSsoConnectionsRepository(): jest.Mocked<OrgSsoConnectionsRepository> {
  const findByOrgId: jest.MockedFunction<
    OrgSsoConnectionsRepository['findByOrgId']
  > = jest.fn().mockResolvedValue(null);
  return {
    acquireMutationLock: jest.fn().mockResolvedValue(true),
    findByOrgId,
    findLocalPasswordLoginEnabledByOrgId: jest.fn().mockResolvedValue(null),
    findLocalPasswordLoginEnabledByOrgIdForSessionIssuance: jest
      .fn()
      .mockResolvedValue(null),
    findByOrgIdWithDomainState: jest
      .fn()
      .mockImplementation(async (orgId: UUID) => {
        const connection = await findByOrgId(orgId);
        return connection ? anOrgSsoConnectionDomainState(connection) : null;
      }),
    findByEmailDomain: jest.fn().mockResolvedValue(null),
    findOwnerOrgIdsByEmailDomains: jest.fn().mockResolvedValue([]),
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
    ...createMappingUpdateMocks(),
  };
}
