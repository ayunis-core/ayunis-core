import type {
  BrokerIdentityAdminClient,
  BrokerUser,
} from 'src/iam/sso/application/ports/broker-identity-admin.client';
import type { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';

export const BROKER_ORG_ID = '385820595704562000';
export const LINKED_SUBJECT = '385820595704562041';
export const UNLINKED_SUBJECT = '385820595704562042';

export function aBrokerUser(id: string, createdAt: Date): BrokerUser {
  return { id, createdAt };
}

export function createMockBrokerIdentityAdminClient(): jest.Mocked<BrokerIdentityAdminClient> {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    listHumanUsers: jest.fn().mockResolvedValue([]),
    findExistingUserIds: jest.fn().mockResolvedValue([]),
    hasIdentityProviderLink: jest.fn().mockResolvedValue(true),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    deleteOrganization: jest.fn().mockResolvedValue(undefined),
  };
}

export function createMockFederatedIdentitiesRepository(): jest.Mocked<FederatedIdentitiesRepository> {
  return {
    existsByUserIdAndIssuer: jest.fn().mockResolvedValue(false),
    findByIssuerAndSubject: jest.fn().mockResolvedValue(null),
    findSubjectsByUserId: jest.fn().mockResolvedValue([]),
    findSubjectsByOrgId: jest.fn().mockResolvedValue([]),
    findLinkedSubjects: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation((identity) => Promise.resolve(identity)),
  };
}
