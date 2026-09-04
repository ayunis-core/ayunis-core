import { CreateFederatedUserCommand } from 'src/iam/users/application/use-cases/create-federated-user/create-federated-user.command';
import { CreateFederatedUserUseCase } from 'src/iam/users/application/use-cases/create-federated-user/create-federated-user.use-case';
import type { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';

const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;
const USER_ID = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;

describe(CreateFederatedUserUseCase.name, () => {
  it.each([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN])(
    'creates a verified %s user without a local password',
    async (role) => {
      const repository: jest.Mocked<UsersRepository> = {
        findOneById: jest.fn(),
        findManyByIdsAndOrgId: jest.fn(),
        findOneByEmail: jest.fn().mockResolvedValue(null),
        verifyEmailIfMatches: jest.fn(),
        hasPasswordlessUsers: jest.fn(),
        findManyByEmails: jest.fn(),
        findManyBySystemRole: jest.fn(),
        findAdminsByOrgId: jest.fn(),
        findManyByOrgId: jest.fn(),
        findAllForSuperAdmin: jest.fn(),
        findAllIdsByOrgId: jest.fn(),
        findAllSummariesByOrgId: jest.fn(),
        create: jest.fn().mockImplementation(async (user) => user),
        update: jest.fn(),
        registerFailedLoginAttempt: jest.fn(),
        resetFailedLoginAttempts: jest.fn(),
        clearLoginLock: jest.fn(),
        delete: jest.fn(),
        isValidPassword: jest.fn(),
      };
      const useCase = new CreateFederatedUserUseCase(repository);

      const user = await useCase.execute(
        new CreateFederatedUserCommand({
          email: 'ada.lovelace@demo.com',
          name: 'Ada Lovelace',
          orgId: ORG_ID,
          role,
        }),
      );

      expect(user).toMatchObject({
        email: 'ada.lovelace@demo.com',
        emailVerified: true,
        passwordHash: null,
        name: 'Ada Lovelace',
        orgId: ORG_ID,
        role,
        hasAcceptedMarketing: false,
      });
      expect(repository.create).toHaveBeenCalledWith(user);
    },
  );

  it('rejects an email that already belongs to a user', async () => {
    const existingUser = {
      id: USER_ID,
    };
    const repository = {
      findOneByEmail: jest.fn().mockResolvedValue(existingUser),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    const useCase = new CreateFederatedUserUseCase(repository);

    await expect(
      useCase.execute(
        new CreateFederatedUserCommand({
          email: 'ada.lovelace@demo.com',
          name: 'Ada Lovelace',
          orgId: ORG_ID,
          role: UserRole.USER,
        }),
      ),
    ).rejects.toMatchObject({ code: 'USER_ALREADY_EXISTS' });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
