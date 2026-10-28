import { createMockRefreshTokensRepository } from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { RevokePasswordSessionsForOrgCommand } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.command';
import { RevokePasswordSessionsForOrgUseCase } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.use-case';
import { TEST_ORG_ID } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';

describe(RevokePasswordSessionsForOrgUseCase.name, () => {
  it('revokes password sessions for the organization', async () => {
    const repository = createMockRefreshTokensRepository();
    const useCase = new RevokePasswordSessionsForOrgUseCase(repository);

    await useCase.execute(new RevokePasswordSessionsForOrgCommand(TEST_ORG_ID));

    expect(repository.revokePasswordSessionsForOrg).toHaveBeenCalledWith(
      TEST_ORG_ID,
    );
  });
});
