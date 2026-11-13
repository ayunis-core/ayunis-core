import { ConfigService } from '@nestjs/config';
import {
  SweepUnlinkedBrokerIdentitiesUseCase,
  UNLINKED_BROKER_IDENTITY_GRACE_MS,
} from 'src/iam/sso/application/use-cases/sweep-unlinked-broker-identities/sweep-unlinked-broker-identities.use-case';
import {
  SsoBrokerIdentityCleanupNotConfiguredError,
  SsoBrokerRequestFailedError,
} from 'src/iam/sso/application/sso.errors';
import { createMockOrgSsoConnectionsRepository } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import {
  BROKER_ORG_ID,
  LINKED_SUBJECT,
  UNLINKED_SUBJECT,
  aBrokerUser,
  createMockBrokerIdentityAdminClient,
  createMockFederatedIdentitiesRepository,
} from 'src/iam/sso/application/testing/broker-identity-cleanup.fixtures';
import {
  SSO_TEST_ISSUER,
  aFederatedIdentity,
} from 'src/iam/sso/application/testing/sso-provisioning.fixtures';

const NOW = new Date('2026-11-11T01:00:00.000Z');
const EXPIRED = new Date(NOW.getTime() - UNLINKED_BROKER_IDENTITY_GRACE_MS - 1);
const RECENT = new Date(NOW.getTime() - UNLINKED_BROKER_IDENTITY_GRACE_MS + 1);
const OTHER_SUBJECT = '385820595704562043';

describe(SweepUnlinkedBrokerIdentitiesUseCase.name, () => {
  let connections: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let identities: ReturnType<typeof createMockFederatedIdentitiesRepository>;
  let brokerAdmin: ReturnType<typeof createMockBrokerIdentityAdminClient>;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    connections = createMockOrgSsoConnectionsRepository();
    connections.findZitadelOrgIds.mockResolvedValue([BROKER_ORG_ID]);
    identities = createMockFederatedIdentitiesRepository();
    brokerAdmin = createMockBrokerIdentityAdminClient();
  });

  afterEach(() => jest.useRealTimers());

  function useCase(issuer: string | null = SSO_TEST_ISSUER) {
    return new SweepUnlinkedBrokerIdentitiesUseCase(
      new ConfigService({ ssoOidc: { issuer: issuer ?? undefined } }),
      connections,
      identities,
      brokerAdmin,
    );
  }

  function deletedUserIds(): string[] {
    return brokerAdmin.deleteUser.mock.calls.map(([userId]) => userId);
  }

  it('deletes an identity that is still unlinked after the grace period', async () => {
    brokerAdmin.listHumanUsers.mockResolvedValue([
      aBrokerUser(UNLINKED_SUBJECT, EXPIRED),
    ]);

    await expect(useCase().execute()).resolves.toEqual({
      organizationCount: 1,
      deletedCount: 1,
      failedCount: 0,
    });
    expect(deletedUserIds()).toEqual([UNLINKED_SUBJECT]);
  });

  it('never deletes the identity of a Core user', async () => {
    brokerAdmin.listHumanUsers.mockResolvedValue([
      aBrokerUser(LINKED_SUBJECT, EXPIRED),
      aBrokerUser(UNLINKED_SUBJECT, EXPIRED),
    ]);
    identities.findLinkedSubjects.mockResolvedValue([LINKED_SUBJECT]);

    await useCase().execute();

    expect(identities.findLinkedSubjects).toHaveBeenCalledWith(
      SSO_TEST_ISSUER,
      [LINKED_SUBJECT, UNLINKED_SUBJECT],
    );
    expect(deletedUserIds()).toEqual([UNLINKED_SUBJECT]);
  });

  it('keeps an identity that was linked while the sweep was running', async () => {
    brokerAdmin.listHumanUsers.mockResolvedValue([
      aBrokerUser(UNLINKED_SUBJECT, EXPIRED),
    ]);
    identities.findByIssuerAndSubject.mockResolvedValue(
      aFederatedIdentity({ subject: UNLINKED_SUBJECT }),
    );

    await useCase().execute();

    expect(deletedUserIds()).toEqual([]);
  });

  it('keeps an identity inside the grace period', async () => {
    brokerAdmin.listHumanUsers.mockResolvedValue([
      aBrokerUser(UNLINKED_SUBJECT, RECENT),
    ]);

    await useCase().execute();

    expect(deletedUserIds()).toEqual([]);
  });

  it('keeps a user without an identity provider link, such as a broker administrator', async () => {
    brokerAdmin.listHumanUsers.mockResolvedValue([
      aBrokerUser(UNLINKED_SUBJECT, EXPIRED),
    ]);
    brokerAdmin.hasIdentityProviderLink.mockResolvedValue(false);

    await useCase().execute();

    expect(deletedUserIds()).toEqual([]);
  });

  it('continues after a failed deletion and counts it', async () => {
    brokerAdmin.listHumanUsers.mockResolvedValue([
      aBrokerUser(UNLINKED_SUBJECT, EXPIRED),
      aBrokerUser(OTHER_SUBJECT, EXPIRED),
    ]);
    brokerAdmin.deleteUser.mockRejectedValueOnce(
      new SsoBrokerRequestFailedError('delete user', 500),
    );

    await expect(useCase().execute()).resolves.toMatchObject({
      deletedCount: 1,
      failedCount: 1,
    });
    expect(deletedUserIds()).toEqual([UNLINKED_SUBJECT, OTHER_SUBJECT]);
  });

  it('fails when SSO is configured without cleanup credentials', async () => {
    brokerAdmin.isConfigured.mockReturnValue(false);

    await expect(useCase().execute()).rejects.toBeInstanceOf(
      SsoBrokerIdentityCleanupNotConfiguredError,
    );
  });

  it('does nothing when SSO is not configured', async () => {
    brokerAdmin.isConfigured.mockReturnValue(false);

    await expect(useCase(null).execute()).resolves.toEqual({
      organizationCount: 0,
      deletedCount: 0,
      failedCount: 0,
    });
  });
});
