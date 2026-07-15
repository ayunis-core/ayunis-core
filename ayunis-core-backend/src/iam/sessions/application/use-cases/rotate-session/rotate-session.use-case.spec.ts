import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RotateSessionUseCase } from './rotate-session.use-case';
import { RotateSessionCommand } from './rotate-session.command';
import { RefreshTokensRepository } from '../../ports/refresh-tokens.repository';
import { RefreshTokenFactory } from '../../services/refresh-token.factory';
import {
  RefreshTokenExpiredError,
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
} from '../../sessions.errors';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
} from '../../testing/refresh-token.fixtures';

describe('RotateSessionUseCase', () => {
  let useCase: RotateSessionUseCase;
  let repository: jest.Mocked<RefreshTokensRepository>;
  let factory: { create: jest.Mock };

  beforeEach(async () => {
    repository = createMockRefreshTokensRepository();
    factory = {
      create: jest.fn().mockReturnValue({
        token: aRefreshToken({ id: 'successor-id' as never }),
        plaintext: 'new-plaintext',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RotateSessionUseCase,
        { provide: RefreshTokensRepository, useValue: repository },
        { provide: RefreshTokenFactory, useValue: factory },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(60) },
        },
      ],
    }).compile();

    useCase = module.get(RotateSessionUseCase);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  const rotate = () => useCase.execute(new RotateSessionCommand('token'));

  it('should rotate: atomically mark used and insert successor in the same family', async () => {
    repository.findByTokenHash.mockResolvedValue(aRefreshToken());
    repository.markUsedAndInsertSuccessor.mockResolvedValue(true);

    const result = await rotate();

    expect(result.refreshToken).toBe('new-plaintext');
    expect(repository.markUsedAndInsertSuccessor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'successor-id' }),
    );
    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.revokeFamily).not.toHaveBeenCalled();
  });

  it('should throw NotFound for an unknown token and write nothing', async () => {
    repository.findByTokenHash.mockResolvedValue(null);

    await expect(rotate()).rejects.toThrow(RefreshTokenNotFoundError);
    expect(repository.markUsedAndInsertSuccessor).not.toHaveBeenCalled();
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('should revoke the family and throw Reuse for a revoked token', async () => {
    repository.findByTokenHash.mockResolvedValue(
      aRefreshToken({ revokedAt: new Date() }),
    );

    await expect(rotate()).rejects.toThrow(RefreshTokenReuseError);
    expect(repository.revokeFamily).toHaveBeenCalledWith(TEST_FAMILY_ID);
  });

  it('should throw Expired for an expired token without rotating', async () => {
    repository.findByTokenHash.mockResolvedValue(
      aRefreshToken({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(rotate()).rejects.toThrow(RefreshTokenExpiredError);
    expect(repository.markUsedAndInsertSuccessor).not.toHaveBeenCalled();
  });

  it('should issue a sibling on a benign race (lost rotation, within grace)', async () => {
    repository.findByTokenHash.mockResolvedValue(aRefreshToken());
    repository.markUsedAndInsertSuccessor.mockResolvedValue(false);
    repository.wasUsedWithinGrace.mockResolvedValue(true);

    const result = await rotate();

    expect(result.refreshToken).toBe('new-plaintext');
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.revokeFamily).not.toHaveBeenCalled();
  });

  it('should revoke the family on a post-grace replay (lost rotation, past grace)', async () => {
    repository.findByTokenHash.mockResolvedValue(aRefreshToken());
    repository.markUsedAndInsertSuccessor.mockResolvedValue(false);
    repository.wasUsedWithinGrace.mockResolvedValue(false);

    await expect(rotate()).rejects.toThrow(RefreshTokenReuseError);
    expect(repository.revokeFamily).toHaveBeenCalledWith(TEST_FAMILY_ID);
    expect(repository.insert).not.toHaveBeenCalled();
  });
});
