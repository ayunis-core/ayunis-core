import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { RevokeSessionsByZitadelSessionCommand } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.command';
import { RevokeSessionsByZitadelSessionUseCase } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.use-case';
import { createMockRefreshTokensRepository } from 'src/iam/sessions/application/testing/refresh-token.fixtures';

describe(RevokeSessionsByZitadelSessionUseCase.name, () => {
  it('revokes only sessions carrying the validated Zitadel session ID', async () => {
    const repository = createMockRefreshTokensRepository();
    const useCase = new RevokeSessionsByZitadelSessionUseCase(
      createPinoLoggerMock(),
      repository,
    );

    await useCase.execute(
      new RevokeSessionsByZitadelSessionCommand('zitadel-session'),
    );

    expect(repository.revokeByZitadelSessionId).toHaveBeenCalledWith(
      'zitadel-session',
    );
  });
});
