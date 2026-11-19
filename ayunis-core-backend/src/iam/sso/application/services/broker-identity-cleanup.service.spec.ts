import { BrokerIdentityCleanupService } from 'src/iam/sso/application/services/broker-identity-cleanup.service';
import {
  SsoBrokerIdentityCleanupIncompleteError,
  SsoBrokerIdentityCleanupNotConfiguredError,
  SsoBrokerRequestFailedError,
} from 'src/iam/sso/application/sso.errors';
import {
  BROKER_ORG_ID,
  LINKED_SUBJECT,
  UNLINKED_SUBJECT,
  createMockBrokerIdentityAdminClient,
} from 'src/iam/sso/application/testing/broker-identity-cleanup.fixtures';

describe(BrokerIdentityCleanupService.name, () => {
  let brokerAdmin: ReturnType<typeof createMockBrokerIdentityAdminClient>;
  let service: BrokerIdentityCleanupService;

  beforeEach(() => {
    brokerAdmin = createMockBrokerIdentityAdminClient();
    service = new BrokerIdentityCleanupService(brokerAdmin);
  });

  it('reports a failed identity deletion after attempting every identity', async () => {
    brokerAdmin.deleteUser.mockImplementation(async (userId) => {
      if (userId === LINKED_SUBJECT)
        throw new SsoBrokerRequestFailedError('delete user', 500);
    });

    await expect(
      service.deleteIdentities([LINKED_SUBJECT, UNLINKED_SUBJECT]),
    ).rejects.toBeInstanceOf(SsoBrokerIdentityCleanupIncompleteError);
    expect(brokerAdmin.deleteUser).toHaveBeenCalledWith(UNLINKED_SUBJECT);
  });

  it('refuses to report success when the cleanup credentials are missing', async () => {
    brokerAdmin.isConfigured.mockReturnValue(false);

    await expect(
      service.deleteOrganization(BROKER_ORG_ID, [LINKED_SUBJECT]),
    ).rejects.toBeInstanceOf(SsoBrokerIdentityCleanupNotConfiguredError);
  });

  it('deletes identities that survived the broker organization deletion', async () => {
    brokerAdmin.findExistingUserIds.mockResolvedValue([UNLINKED_SUBJECT]);

    await service.deleteOrganization(BROKER_ORG_ID, [
      LINKED_SUBJECT,
      UNLINKED_SUBJECT,
    ]);

    expect(brokerAdmin.deleteOrganization).toHaveBeenCalledWith(BROKER_ORG_ID);
    expect(brokerAdmin.deleteUser.mock.calls).toEqual([[UNLINKED_SUBJECT]]);
  });

  it('deletes every identity when the broker cannot say which still exist', async () => {
    brokerAdmin.findExistingUserIds.mockRejectedValue(
      new SsoBrokerRequestFailedError('list users', 500),
    );

    await service.deleteOrganization(BROKER_ORG_ID, [
      LINKED_SUBJECT,
      UNLINKED_SUBJECT,
    ]);

    expect(brokerAdmin.deleteUser.mock.calls).toEqual([
      [LINKED_SUBJECT],
      [UNLINKED_SUBJECT],
    ]);
  });

  it('still deletes the identities when the broker organization deletion fails', async () => {
    brokerAdmin.deleteOrganization.mockRejectedValue(
      new SsoBrokerRequestFailedError('delete organization', 500),
    );
    brokerAdmin.findExistingUserIds.mockResolvedValue([LINKED_SUBJECT]);

    await expect(
      service.deleteOrganization(BROKER_ORG_ID, [LINKED_SUBJECT]),
    ).rejects.toBeInstanceOf(SsoBrokerIdentityCleanupIncompleteError);
    expect(brokerAdmin.deleteUser).toHaveBeenCalledWith(LINKED_SUBJECT);
  });
});
