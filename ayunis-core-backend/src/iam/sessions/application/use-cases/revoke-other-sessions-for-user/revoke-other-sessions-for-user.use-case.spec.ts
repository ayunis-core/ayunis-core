import { Logger } from '@nestjs/common';
import { RevokeOtherSessionsForUserUseCase } from './revoke-other-sessions-for-user.use-case';
import { RevokeOtherSessionsForUserCommand } from './revoke-other-sessions-for-user.command';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
  TEST_USER_ID,
} from '../../testing/refresh-token.fixtures';

describe('RevokeOtherSessionsForUserUseCase', () => {
  let useCase: RevokeOtherSessionsForUserUseCase;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    useCase = new RevokeOtherSessionsForUserUseCase(repository);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should keep the current family and revoke the rest', async () => {
    repository.findByTokenHash.mockResolvedValue(aRefreshToken());

    await useCase.execute(
      new RevokeOtherSessionsForUserCommand(TEST_USER_ID, 'current-token'),
    );

    expect(repository.revokeAllForUserExceptFamily).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_FAMILY_ID,
    );
    expect(repository.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('should revoke all sessions when the current token is unknown', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    await useCase.execute(
      new RevokeOtherSessionsForUserCommand(TEST_USER_ID, 'stale'),
    );

    expect(repository.revokeAllForUser).toHaveBeenCalledWith(TEST_USER_ID);
    expect(repository.revokeAllForUserExceptFamily).not.toHaveBeenCalled();
  });

  it('should revoke all sessions when no current token is supplied', async () => {
    await useCase.execute(
      new RevokeOtherSessionsForUserCommand(TEST_USER_ID, undefined),
    );

    expect(repository.revokeAllForUser).toHaveBeenCalledWith(TEST_USER_ID);
    expect(repository.findByTokenHash).not.toHaveBeenCalled();
  });
});
