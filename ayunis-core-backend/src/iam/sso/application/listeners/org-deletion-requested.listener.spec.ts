import { ConfigService } from '@nestjs/config';
import { EVENT_LISTENER_METADATA } from '@nestjs/event-emitter';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { SsoOrgDeletionRequestedListener } from 'src/iam/sso/application/listeners/org-deletion-requested.listener';
import { BrokerIdentityCleanupService } from 'src/iam/sso/application/services/broker-identity-cleanup.service';
import {
  BROKER_ORG_ID,
  LINKED_SUBJECT,
  createMockBrokerIdentityAdminClient,
  createMockFederatedIdentitiesRepository,
} from 'src/iam/sso/application/testing/broker-identity-cleanup.fixtures';
import {
  TEST_ORG_ID,
  anOrgSsoConnection,
  createMockOrgSsoConnectionsRepository,
} from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { SSO_TEST_ISSUER } from 'src/iam/sso/application/testing/sso-provisioning.fixtures';

describe(SsoOrgDeletionRequestedListener.name, () => {
  let connections: ReturnType<typeof createMockOrgSsoConnectionsRepository>;
  let identities: ReturnType<typeof createMockFederatedIdentitiesRepository>;
  let brokerAdmin: ReturnType<typeof createMockBrokerIdentityAdminClient>;
  let listener: SsoOrgDeletionRequestedListener;

  beforeEach(() => {
    connections = createMockOrgSsoConnectionsRepository();
    identities = createMockFederatedIdentitiesRepository();
    brokerAdmin = createMockBrokerIdentityAdminClient();
    listener = new SsoOrgDeletionRequestedListener(
      new ConfigService({ ssoOidc: { issuer: SSO_TEST_ISSUER } }),
      connections,
      identities,
      new BrokerIdentityCleanupService(brokerAdmin),
    );
  });

  it('rejects the deletion when the broker targets cannot be read, instead of leaking the broker organization', () => {
    const metadata = Reflect.getMetadata(
      EVENT_LISTENER_METADATA,
      SsoOrgDeletionRequestedListener.prototype.handleOrgDeletionRequested,
    ) as unknown;

    expect(metadata).toEqual([
      {
        event: OrgDeletionRequestedEvent.EVENT_NAME,
        options: { suppressErrors: false },
      },
    ]);
  });

  it('registers no cleanup for an organization without SSO, so its deletion cannot be reported incomplete', async () => {
    const event = new OrgDeletionRequestedEvent(TEST_ORG_ID);

    await listener.handleOrgDeletionRequested(event);

    expect(event.takeCleanupTasks()).toEqual([]);
  });

  it('deletes the broker organization and the identities resolved before the row delete', async () => {
    connections.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ zitadelOrgId: BROKER_ORG_ID }),
    );
    identities.findSubjectsByOrgId.mockResolvedValue([LINKED_SUBJECT]);
    brokerAdmin.findExistingUserIds.mockImplementation(async (ids) => ids);
    const event = new OrgDeletionRequestedEvent(TEST_ORG_ID);

    await listener.handleOrgDeletionRequested(event);
    identities.findSubjectsByOrgId.mockResolvedValue([]);
    for (const task of event.takeCleanupTasks()) await task.run();

    expect(identities.findSubjectsByOrgId).toHaveBeenCalledWith(
      TEST_ORG_ID,
      SSO_TEST_ISSUER,
    );
    expect(brokerAdmin.deleteOrganization).toHaveBeenCalledWith(BROKER_ORG_ID);
    expect(brokerAdmin.deleteUser).toHaveBeenCalledWith(LINKED_SUBJECT);
  });
});
