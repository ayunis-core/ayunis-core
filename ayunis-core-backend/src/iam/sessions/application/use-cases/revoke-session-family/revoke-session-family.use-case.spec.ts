import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { RevokeSessionFamilyUseCase } from './revoke-session-family.use-case';
import { RevokeSessionFamilyCommand } from './revoke-session-family.command';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
} from '../../testing/refresh-token.fixtures';

describe('RevokeSessionFamilyUseCase', () => {
  let useCase: RevokeSessionFamilyUseCase;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    useCase = new RevokeSessionFamilyUseCase(
      createPinoLoggerMock(),
      repository,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should revoke the family of a known token', async () => {
    repository.findByTokenHash.mockResolvedValue(aRefreshToken());

    await useCase.execute(new RevokeSessionFamilyCommand('token'));

    expect(repository.revokeFamily).toHaveBeenCalledWith(TEST_FAMILY_ID);
  });

  it('should no-op on an unknown token (idempotent logout)', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute(new RevokeSessionFamilyCommand('unknown')),
    ).resolves.toBeUndefined();
    expect(repository.revokeFamily).not.toHaveBeenCalled();
  });
});
