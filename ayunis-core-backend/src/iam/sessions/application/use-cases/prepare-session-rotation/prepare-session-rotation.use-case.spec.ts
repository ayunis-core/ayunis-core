import {
  RefreshTokenExpiredError,
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
} from 'src/iam/sessions/application/sessions.errors';
import {
  TEST_FAMILY_ID,
  aRefreshToken,
  createMockRefreshTokensRepository,
} from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { PrepareSessionRotationCommand } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.command';
import { PrepareSessionRotationUseCase } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.use-case';

describe(PrepareSessionRotationUseCase.name, () => {
  const repository = createMockRefreshTokensRepository();
  const useCase = new PrepareSessionRotationUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('returns the validated session without writing', async () => {
    const current = aRefreshToken();
    repository.findByTokenHash.mockResolvedValue(current);

    await expect(prepare()).resolves.toBe(current);
    expect(repository.markUsedAndInsertSuccessor).not.toHaveBeenCalled();
  });

  it('rejects an unknown token', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    await expect(prepare()).rejects.toThrow(RefreshTokenNotFoundError);
  });

  it('revokes the family and rejects a revoked token', async () => {
    repository.findByTokenHash.mockResolvedValue(
      aRefreshToken({ revokedAt: new Date() }),
    );

    await expect(prepare()).rejects.toThrow(RefreshTokenReuseError);
    expect(repository.revokeFamily).toHaveBeenCalledWith(TEST_FAMILY_ID);
  });

  it('rejects an expired token', async () => {
    repository.findByTokenHash.mockResolvedValue(
      aRefreshToken({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(prepare()).rejects.toThrow(RefreshTokenExpiredError);
  });

  function prepare() {
    return useCase.execute(new PrepareSessionRotationCommand('token'));
  }
});
