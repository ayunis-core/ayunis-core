import { Logger } from '@nestjs/common';
import { RevokeAllSessionsForUserUseCase } from './revoke-all-sessions-for-user.use-case';
import { RevokeAllSessionsForUserCommand } from './revoke-all-sessions-for-user.command';
import {
  createMockRefreshTokensRepository,
  TEST_USER_ID,
} from '../../testing/refresh-token.fixtures';

describe('RevokeAllSessionsForUserUseCase', () => {
  let useCase: RevokeAllSessionsForUserUseCase;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    useCase = new RevokeAllSessionsForUserUseCase(repository);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should revoke every session for the user', async () => {
    await useCase.execute(new RevokeAllSessionsForUserCommand(TEST_USER_ID));

    expect(repository.revokeAllForUser).toHaveBeenCalledWith(TEST_USER_ID);
  });
});
