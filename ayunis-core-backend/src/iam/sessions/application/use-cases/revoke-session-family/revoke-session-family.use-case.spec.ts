import { Logger } from '@nestjs/common';
import { RevokeSessionFamilyUseCase } from './revoke-session-family.use-case';
import { RevokeSessionFamilyCommand } from './revoke-session-family.command';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
} from '../../testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe('RevokeSessionFamilyUseCase', () => {
  let useCase: RevokeSessionFamilyUseCase;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    useCase = new RevokeSessionFamilyUseCase(repository);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should revoke the family of a known token', async () => {
    repository.findByTokenHash.mockResolvedValue(aRefreshToken());

    await expect(
      useCase.execute(new RevokeSessionFamilyCommand('token')),
    ).resolves.toEqual({
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });

    expect(repository.revokeFamily).toHaveBeenCalledWith(TEST_FAMILY_ID);
  });

  it('should no-op on an unknown token (idempotent logout)', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute(new RevokeSessionFamilyCommand('unknown')),
    ).resolves.toBeNull();
    expect(repository.revokeFamily).not.toHaveBeenCalled();
  });
});
