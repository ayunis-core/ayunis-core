jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { InviteAlreadyAcceptedError } from 'src/iam/invites/application/invites.errors';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { anOrgSsoConnection } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { ProvisionOrgSsoUserCommand } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.command';
import { ProvisionOrgSsoUserUseCase } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.use-case';
import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';
import { UserAlreadyExistsError } from 'src/iam/users/application/users.errors';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const ORG_ID = randomUUID();
const OTHER_ORG_ID = randomUUID();
const USER_ID = randomUUID();

describe(ProvisionOrgSsoUserUseCase.name, () => {
  const connections = { findByOrgId: jest.fn() };
  const identities = {
    findByIssuerAndSubject: jest.fn(),
    create: jest.fn(),
  };
  const lock = { acquireIdentity: jest.fn(), acquireEmail: jest.fn() };
  const findUserById = { execute: jest.fn() };
  const findUserByEmail = { execute: jest.fn() };
  const createFederatedUser = { execute: jest.fn() };
  const findInvite = { execute: jest.fn() };
  const acceptInvite = { execute: jest.fn() };
  const assertSeat = { execute: jest.fn() };
  const publishUserCreated = { publish: jest.fn() };
  const acquireAllocationLock = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    connections.findByOrgId.mockResolvedValue(connection(true));
    identities.findByIssuerAndSubject.mockResolvedValue(null);
    findUserByEmail.execute.mockResolvedValue(null);
    findInvite.execute.mockResolvedValue(null);
    acceptInvite.execute.mockResolvedValue(undefined);
    createFederatedUser.execute.mockResolvedValue(user());
    acquireAllocationLock.execute.mockResolvedValue(undefined);
  });

  it('returns an existing issuer-subject mapping without consuming a seat', async () => {
    identities.findByIssuerAndSubject.mockResolvedValue(
      new FederatedIdentity({
        issuer: login().issuer,
        subject: login().subject,
        userId: USER_ID,
      }),
    );
    findUserById.execute.mockResolvedValue(user());

    await expect(useCase().execute(command())).resolves.toMatchObject({
      id: USER_ID,
    });

    expect(assertSeat.execute).not.toHaveBeenCalled();
    expect(createFederatedUser.execute).not.toHaveBeenCalled();
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it.each([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN])(
    'provisions an invited %s and preserves the role while JIT is disabled',
    async (role) => {
      const invite = pendingInvite(role);
      findInvite.execute.mockResolvedValue(invite);

      await useCase().execute(command());

      expect(createFederatedUser.execute).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
      );
      expect(acceptInvite.execute).toHaveBeenCalledWith(
        expect.objectContaining({ inviteId: invite.id }),
      );
      expect(assertSeat.execute).not.toHaveBeenCalled();
      expect(publishUserCreated.publish).toHaveBeenCalledWith(
        expect.objectContaining({ id: USER_ID }),
      );
    },
  );

  it('locks the invite before creating its user', async () => {
    findInvite.execute.mockResolvedValue(pendingInvite(UserRole.USER));

    await useCase().execute(command());

    expect(acceptInvite.execute.mock.invocationCallOrder[0]).toBeLessThan(
      createFederatedUser.execute.mock.invocationCallOrder[0],
    );
  });

  it('requires account linking when password invite acceptance wins the race', async () => {
    findInvite.execute.mockResolvedValue(pendingInvite(UserRole.USER));
    acceptInvite.execute.mockRejectedValue(new InviteAlreadyAcceptedError());

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_ACCOUNT_LINK_REQUIRED',
    });
    expect(createFederatedUser.execute).not.toHaveBeenCalled();
    expect(identities.create).not.toHaveBeenCalled();
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('provisions a JIT user as USER after seat admission', async () => {
    connections.findByOrgId.mockResolvedValue(connection(true));

    await useCase().execute(command());

    expect(assertSeat.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID }),
    );
    expect(createFederatedUser.execute).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.USER }),
    );
    expect(identities.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it('honors an invite that commits while SSO waits for the organization lock', async () => {
    const invite = pendingInvite(UserRole.ADMIN);
    let allocationLocked = false;
    acquireAllocationLock.execute.mockImplementation(async () => {
      allocationLocked = true;
    });
    findInvite.execute.mockImplementation(async () =>
      allocationLocked ? invite : null,
    );

    await useCase().execute(command());

    expect(createFederatedUser.execute).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.ADMIN }),
    );
    expect(acceptInvite.execute).toHaveBeenCalledWith(
      expect.objectContaining({ inviteId: invite.id }),
    );
    expect(assertSeat.execute).not.toHaveBeenCalled();
  });

  it('requires an invitation when JIT is disabled', async () => {
    connections.findByOrgId.mockResolvedValue(connection(false));

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_JIT_PROVISIONING_DISABLED',
    });
    expect(createFederatedUser.execute).not.toHaveBeenCalled();
  });

  it('requires account linking when local invite acceptance commits while SSO waits for the organization lock', async () => {
    connections.findByOrgId.mockResolvedValue(connection(false));
    acquireAllocationLock.execute.mockImplementation(async () => {
      findUserByEmail.execute.mockResolvedValue(user());
    });

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_ACCOUNT_LINK_REQUIRED',
    });
    expect(createFederatedUser.execute).not.toHaveBeenCalled();
  });

  it('rejects provisioning when the connection was disabled after login', async () => {
    connections.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({ orgId: ORG_ID, enabled: false }),
    );

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_CONNECTION_NOT_AVAILABLE',
    });
    expect(lock.acquireIdentity).not.toHaveBeenCalled();
  });

  it('rejects provisioning when the broker organization changed after login', async () => {
    connections.findByOrgId.mockResolvedValue(
      anOrgSsoConnection({
        orgId: ORG_ID,
        enabled: true,
        zitadelOrgId: 'different-zitadel-org',
      }),
    );

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_ORGANIZATION_MISMATCH',
    });
    expect(createFederatedUser.execute).not.toHaveBeenCalled();
  });

  it('requires an exact email-domain match', async () => {
    const mismatchedLogin = { ...login(), email: 'staff@sub.stadt.example' };

    await expect(
      useCase().execute(new ProvisionOrgSsoUserCommand(mismatchedLogin)),
    ).rejects.toMatchObject({ code: 'SSO_ORGANIZATION_MISMATCH' });
    expect(createFederatedUser.execute).not.toHaveBeenCalled();
  });

  it('requires explicit linking for an existing local account', async () => {
    findUserByEmail.execute.mockResolvedValue(user());

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_ACCOUNT_LINK_REQUIRED',
    });
  });

  it('requires explicit linking when concurrent user creation wins the email race', async () => {
    createFederatedUser.execute.mockRejectedValue(
      new UserAlreadyExistsError(login().email),
    );

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_ACCOUNT_LINK_REQUIRED',
    });
    expect(identities.create).not.toHaveBeenCalled();
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('never moves an existing user from another organization', async () => {
    findUserByEmail.execute.mockResolvedValue(user(OTHER_ORG_ID));

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_ORGANIZATION_MISMATCH',
    });
  });

  it('rejects an expired invite instead of bypassing its assigned role via JIT', async () => {
    findInvite.execute.mockResolvedValue(
      pendingInvite(UserRole.ADMIN, new Date('2020-01-01T00:00:00.000Z')),
    );

    await expect(useCase().execute(command())).rejects.toMatchObject({
      code: 'SSO_INVITE_EXPIRED',
    });
  });

  function useCase(): ProvisionOrgSsoUserUseCase {
    return new ProvisionOrgSsoUserUseCase(
      createPinoLoggerMock(),
      connections as never,
      identities,
      lock,
      findUserById as never,
      findUserByEmail as never,
      createFederatedUser as never,
      findInvite as never,
      acceptInvite as never,
      assertSeat as never,
      publishUserCreated as never,
      acquireAllocationLock as never,
    );
  }
});

function command(): ProvisionOrgSsoUserCommand {
  return new ProvisionOrgSsoUserCommand(login());
}

function login() {
  return {
    issuer: 'https://sso.ayunis.de',
    subject: 'zitadel-user',
    email: 'staff@stadt.example',
    name: 'Erika Mustermann',
    emailVerified: true,
    zitadelOrgId: 'zitadel-org-1',
    orgId: ORG_ID,
    postLoginPath: '/',
  };
}

function connection(jitProvisioningEnabled: boolean) {
  return anOrgSsoConnection({
    orgId: ORG_ID,
    enabled: true,
    jitProvisioningEnabled,
  });
}

function user(orgId = ORG_ID): User {
  return new User({
    id: USER_ID,
    email: 'staff@stadt.example',
    emailVerified: true,
    passwordHash: null,
    role: UserRole.USER,
    orgId,
    name: 'Erika Mustermann',
    hasAcceptedMarketing: false,
  });
}

function pendingInvite(role: UserRole, expiresAt = new Date('2099-01-01')) {
  return new Invite({
    email: 'staff@stadt.example',
    orgId: ORG_ID,
    role,
    expiresAt,
  });
}
