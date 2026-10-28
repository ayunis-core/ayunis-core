import { RevokeSsoSessionsForUserCommand } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.command';
import { RevokeSsoSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.use-case';
import {
  createMockRefreshTokensRepository,
  TEST_USER_ID,
} from 'src/iam/sessions/application/testing/refresh-token.fixtures';

describe(RevokeSsoSessionsForUserUseCase.name, () => {
  it('revokes SSO sessions without touching password sessions', async () => {
    const repository = createMockRefreshTokensRepository();
    const useCase = new RevokeSsoSessionsForUserUseCase(repository);

    await useCase.execute(new RevokeSsoSessionsForUserCommand(TEST_USER_ID));

    expect(repository.revokeSsoForUser).toHaveBeenCalledWith(TEST_USER_ID);
  });
});
