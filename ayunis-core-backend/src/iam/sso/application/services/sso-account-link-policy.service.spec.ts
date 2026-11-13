import { ConfigService } from '@nestjs/config';
import { SsoAccountLinkPolicyService } from './sso-account-link-policy.service';
import { createMockOrgSsoConnectionsRepository } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import {
  anEnabledSsoConnection,
  SSO_TEST_ORG_ID,
} from 'src/iam/sso/application/testing/sso-login.fixtures';
import {
  SSO_TEST_ISSUER,
  SSO_TEST_USER_ID,
} from 'src/iam/sso/application/testing/sso-provisioning.fixtures';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';

describe('SSO account linking eligibility', () => {
  const connections = createMockOrgSsoConnectionsRepository();
  const identities = {
    existsByUserIdAndIssuer: jest.fn(),
    findSubjectsByUserId: jest.fn().mockResolvedValue([]),
    findSubjectsByOrgId: jest.fn().mockResolvedValue([]),
    findLinkedSubjects: jest.fn().mockResolvedValue([]),
    findByIssuerAndSubject: jest.fn(),
    create: jest.fn(),
  };
  const users = { execute: jest.fn() };
  const service = new SsoAccountLinkPolicyService(
    connections,
    identities,
    users as unknown as FindUserByIdUseCase,
    new ConfigService({ ssoOidc: { issuer: SSO_TEST_ISSUER } }),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    connections.findByOrgId.mockResolvedValue(anEnabledSsoConnection());
    users.execute.mockResolvedValue(
      aUser({
        id: SSO_TEST_USER_ID,
        orgId: SSO_TEST_ORG_ID,
        email: 'staff@demo.com',
      }),
    );
    identities.existsByUserIdAndIssuer.mockResolvedValue(false);
  });

  it('offers linking to an eligible unlinked account', async () => {
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: true, isLinked: false });
  });

  it('shows an existing identity as connected, including JIT users', async () => {
    identities.existsByUserIdAndIssuer.mockResolvedValue(true);
    users.execute.mockResolvedValue(
      aUser({
        id: SSO_TEST_USER_ID,
        orgId: SSO_TEST_ORG_ID,
        email: 'staff@demo.com',
        passwordHash: null,
      }),
    );
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false, isLinked: true });
  });

  it.each([
    { enabled: false },
    { zitadelOrgId: null },
    { localPasswordLoginEnabled: false },
  ])('does not offer linking for connection %j', async (changes) => {
    connections.findByOrgId.mockResolvedValue(anEnabledSsoConnection(changes));
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false });
  });

  it('hides linking for an unapproved email domain', async () => {
    users.execute.mockResolvedValue(
      aUser({ orgId: SSO_TEST_ORG_ID, email: 'staff@other.example' }),
    );
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false, isLinked: false });
  });

  it('hides linking when no connection or broker is configured', async () => {
    connections.findByOrgId.mockResolvedValue(null);
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false, isLinked: false });
    connections.findByOrgId.mockResolvedValue(anEnabledSsoConnection());
    const unconfigured = new SsoAccountLinkPolicyService(
      connections,
      identities,
      users as unknown as FindUserByIdUseCase,
      new ConfigService(),
    );
    await expect(
      unconfigured.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false, isLinked: false });
    expect(identities.existsByUserIdAndIssuer).not.toHaveBeenCalled();
  });

  it('keeps linked SSO-only accounts connected', async () => {
    connections.findByOrgId.mockResolvedValue(
      anEnabledSsoConnection({ localPasswordLoginEnabled: false }),
    );
    identities.existsByUserIdAndIssuer.mockResolvedValue(true);
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false, isLinked: true });
  });

  it('does not use another organisation to offer linking', async () => {
    users.execute.mockResolvedValue(
      aUser({
        orgId: '22222222-2222-2222-2222-222222222222',
        email: 'staff@demo.com',
      }),
    );
    await expect(
      service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID),
    ).resolves.toMatchObject({ canLink: false, isLinked: false });
  });

  it('checks the authenticated user and configured broker, not another identity', async () => {
    await service.evaluate(SSO_TEST_USER_ID, SSO_TEST_ORG_ID);
    expect(identities.existsByUserIdAndIssuer).toHaveBeenCalledWith(
      SSO_TEST_USER_ID,
      SSO_TEST_ISSUER,
    );
  });
});
