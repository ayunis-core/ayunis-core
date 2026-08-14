import type { UUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { FederatedIdentityAlreadyExistsError } from 'src/iam/sso/application/ports/federated-identities.repository';
import { LinkFederatedIdentityCommand } from 'src/iam/sso/application/use-cases/link-federated-identity/link-federated-identity.command';
import { LinkFederatedIdentityUseCase } from 'src/iam/sso/application/use-cases/link-federated-identity/link-federated-identity.use-case';
import {
  aFederatedIdentity,
  SSO_TEST_ISSUER,
  SSO_TEST_ORG_ID,
  SSO_TEST_SUBJECT,
  SSO_TEST_USER_ID,
} from 'src/iam/sso/application/testing/sso-provisioning.fixtures';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const OTHER_USER_ID = '19ef23ac-1e0f-4348-9996-4714a6114262' as UUID;
const OTHER_ORG_ID: UUID = 'b85c62a7-f2aa-4937-806b-c9db1b975ce4';

describe(LinkFederatedIdentityUseCase.name, () => {
  const identities = {
    findByIssuerAndSubject: jest.fn(),
    create: jest.fn(),
  };
  const lock = { acquireIdentity: jest.fn(), acquireEmail: jest.fn() };
  const findUser = { execute: jest.fn() };
  const useCase = new LinkFederatedIdentityUseCase(
    createPinoLoggerMock(),
    identities,
    lock,
    findUser as unknown as FindUserByIdUseCase,
  );

  const login = {
    issuer: SSO_TEST_ISSUER,
    subject: SSO_TEST_SUBJECT,
    email: 'staff@demo.com',
    emailVerified: true,
    name: 'Erika Mustermann',
    zitadelOrgId: '385820595704561666',
    authenticationMethods: ['pwd'],
    orgId: SSO_TEST_ORG_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    identities.findByIssuerAndSubject.mockResolvedValue(null);
    identities.create.mockImplementation(async (identity) => identity);
    findUser.execute.mockResolvedValue(
      new User({
        id: SSO_TEST_USER_ID,
        email: 'Staff@Demo.com',
        emailVerified: true,
        passwordHash: 'local-password-hash',
        role: UserRole.USER,
        orgId: SSO_TEST_ORG_ID,
        name: 'Erika Mustermann',
        hasAcceptedMarketing: false,
      }),
    );
  });

  it('links the validated broker identity to the authenticated local user', async () => {
    await expect(
      useCase.execute(
        new LinkFederatedIdentityCommand(SSO_TEST_USER_ID, login),
      ),
    ).resolves.toMatchObject({ userId: SSO_TEST_USER_ID });

    expect(lock.acquireIdentity).toHaveBeenCalledWith(
      SSO_TEST_ISSUER,
      SSO_TEST_SUBJECT,
    );
    expect(lock.acquireEmail).toHaveBeenCalledWith('staff@demo.com');
    expect(identities.create).toHaveBeenCalledWith(
      expect.objectContaining({
        issuer: SSO_TEST_ISSUER,
        subject: SSO_TEST_SUBJECT,
        userId: SSO_TEST_USER_ID,
      }),
    );
  });

  it('is idempotent when the identity is already linked to the same user', async () => {
    const identity = aFederatedIdentity();
    identities.findByIssuerAndSubject.mockResolvedValue(identity);

    await expect(
      useCase.execute(
        new LinkFederatedIdentityCommand(SSO_TEST_USER_ID, login),
      ),
    ).resolves.toBe(identity);
    expect(identities.create).not.toHaveBeenCalled();
  });

  it('rejects an identity already linked to another user', async () => {
    identities.findByIssuerAndSubject.mockResolvedValue(
      aFederatedIdentity({ userId: OTHER_USER_ID }),
    );

    await expect(
      useCase.execute(
        new LinkFederatedIdentityCommand(SSO_TEST_USER_ID, login),
      ),
    ).rejects.toMatchObject({ code: 'SSO_ACCOUNT_LINK_CONFLICT' });
  });

  it.each([
    { field: 'email', login: { ...login, email: 'other@demo.com' } },
    { field: 'email_verified', login: { ...login, emailVerified: false } },
    {
      field: 'orgId',
      login: {
        ...login,
        orgId: OTHER_ORG_ID,
      },
    },
  ])('rejects a mismatched $field', async ({ login: mismatchedLogin }) => {
    await expect(
      useCase.execute(
        new LinkFederatedIdentityCommand(SSO_TEST_USER_ID, mismatchedLogin),
      ),
    ).rejects.toMatchObject({ code: 'SSO_ACCOUNT_LINK_MISMATCH' });
    expect(identities.create).not.toHaveBeenCalled();
  });

  it('returns the concurrent link when the same user won the insert race', async () => {
    const identity = aFederatedIdentity();
    identities.create.mockRejectedValue(
      new FederatedIdentityAlreadyExistsError(),
    );
    identities.findByIssuerAndSubject
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(identity);

    await expect(
      useCase.execute(
        new LinkFederatedIdentityCommand(SSO_TEST_USER_ID, login),
      ),
    ).resolves.toBe(identity);
  });
});
