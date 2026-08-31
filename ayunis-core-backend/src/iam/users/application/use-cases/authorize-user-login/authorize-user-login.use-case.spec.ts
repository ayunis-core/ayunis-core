import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserAuthenticationFailedError } from 'src/iam/users/application/users.errors';
import {
  aUser,
  TEST_USER_ID,
} from 'src/iam/users/application/testing/user.fixtures';
import { AuthorizeUserLoginCommand } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.command';
import { AuthorizeUserLoginUseCase } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.use-case';

describe(AuthorizeUserLoginUseCase.name, () => {
  const usersRepository = {
    findOneById: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
  };
  const useCase = new AuthorizeUserLoginUseCase(
    createPinoLoggerMock(),
    usersRepository as unknown as UsersRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('clears failed attempts for an unlocked account', async () => {
    const user = aUser();
    usersRepository.findOneById.mockResolvedValue(user);
    usersRepository.resetFailedLoginAttempts.mockResolvedValue(true);

    await expect(
      useCase.execute(new AuthorizeUserLoginCommand(user.id)),
    ).resolves.toBeUndefined();
    expect(usersRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(
      user.id,
    );
  });

  it('rejects a locked account without clearing its state', async () => {
    const user = aUser({
      lockedAt: new Date('2026-08-24T10:00:00.000Z'),
    });
    usersRepository.findOneById.mockResolvedValue(user);

    await expect(
      useCase.execute(new AuthorizeUserLoginCommand(user.id)),
    ).rejects.toThrow(UserAuthenticationFailedError);
    expect(usersRepository.resetFailedLoginAttempts).not.toHaveBeenCalled();
  });

  it('rejects when a concurrent failed attempt locks the account', async () => {
    const user = aUser();
    usersRepository.findOneById.mockResolvedValue(user);
    usersRepository.resetFailedLoginAttempts.mockResolvedValue(false);

    await expect(
      useCase.execute(new AuthorizeUserLoginCommand(user.id)),
    ).rejects.toThrow(UserAuthenticationFailedError);
  });

  it('uses the generic authentication contract when the account disappeared', async () => {
    usersRepository.findOneById.mockResolvedValue(null);

    await expect(
      useCase.execute(new AuthorizeUserLoginCommand(TEST_USER_ID)),
    ).rejects.toThrow(UserAuthenticationFailedError);
  });
});
