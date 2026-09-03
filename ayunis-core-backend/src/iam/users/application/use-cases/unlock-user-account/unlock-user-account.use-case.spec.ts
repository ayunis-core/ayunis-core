import type { ContextService } from 'src/common/context/services/context.service';
import type { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserNotFoundError,
  UserUnauthorizedError,
} from 'src/iam/users/application/users.errors';
import {
  aUser,
  TEST_USER_ID,
} from 'src/iam/users/application/testing/user.fixtures';
import { UnlockUserAccountCommand } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.command';
import { UnlockUserAccountUseCase } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

describe(UnlockUserAccountUseCase.name, () => {
  const lockedAt = new Date('2026-08-24T10:00:00.000Z');
  const usersRepository = {
    findOneById: jest.fn(),
    clearLoginLock: jest.fn(),
  };
  const context = { get: jest.fn() };
  const useCase = new UnlockUserAccountUseCase(
    context as unknown as ContextService,
    usersRepository as unknown as UsersRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('allows a super admin to unlock a user in any organization', async () => {
    const target = aUser({ lockedAt });
    usersRepository.findOneById.mockResolvedValue(target);
    usersRepository.clearLoginLock.mockResolvedValue(true);
    mockContext({ systemRole: SystemRole.SUPER_ADMIN });

    await useCase.execute(new UnlockUserAccountCommand(target.id));

    expect(usersRepository.clearLoginLock).toHaveBeenCalledWith(target.id);
  });

  it('allows an admin to unlock a user in the same organization', async () => {
    const target = aUser({ lockedAt });
    usersRepository.findOneById.mockResolvedValue(target);
    usersRepository.clearLoginLock.mockResolvedValue(true);
    mockContext({ role: UserRole.ADMIN, orgId: target.orgId });

    await expect(
      useCase.execute(new UnlockUserAccountCommand(target.id)),
    ).resolves.toBeUndefined();
  });

  it('rejects an admin attempting to unlock their own account', async () => {
    const target = aUser({ lockedAt });
    usersRepository.findOneById.mockResolvedValue(target);
    mockContext({
      userId: target.id,
      role: UserRole.ADMIN,
      orgId: target.orgId,
    });

    await expect(
      useCase.execute(new UnlockUserAccountCommand(target.id)),
    ).rejects.toThrow(UserUnauthorizedError);
    expect(usersRepository.clearLoginLock).not.toHaveBeenCalled();
  });

  it('rejects an admin targeting another organization', async () => {
    const target = aUser({ lockedAt });
    usersRepository.findOneById.mockResolvedValue(target);
    mockContext({
      role: UserRole.ADMIN,
      orgId: '820bd986-1c7d-4eb5-b541-86de9c2c695f',
    });

    await expect(
      useCase.execute(new UnlockUserAccountCommand(target.id)),
    ).rejects.toThrow(UserNotFoundError);
    expect(usersRepository.clearLoginLock).not.toHaveBeenCalled();
  });

  it('rejects a regular user targeting their own organization', async () => {
    const target = aUser({ lockedAt });
    usersRepository.findOneById.mockResolvedValue(target);
    mockContext({ role: UserRole.USER, orgId: target.orgId });

    await expect(
      useCase.execute(new UnlockUserAccountCommand(target.id)),
    ).rejects.toThrow(UserUnauthorizedError);
  });

  it('reports a missing or concurrently deleted user', async () => {
    usersRepository.findOneById.mockResolvedValue(null);
    mockContext({ systemRole: SystemRole.SUPER_ADMIN });

    await expect(
      useCase.execute(new UnlockUserAccountCommand(TEST_USER_ID)),
    ).rejects.toThrow(UserNotFoundError);
  });

  function mockContext(values: {
    orgId?: string;
    role?: UserRole;
    systemRole?: SystemRole;
    userId?: string;
  }): void {
    context.get.mockImplementation((key: keyof typeof values) => values[key]);
  }
});
