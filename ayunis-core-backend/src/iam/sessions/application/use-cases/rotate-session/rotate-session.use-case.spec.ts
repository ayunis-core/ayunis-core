import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { ConfigService } from '@nestjs/config';
import { RotateSessionUseCase } from './rotate-session.use-case';
import { RotateSessionCommand } from './rotate-session.command';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import {
  RefreshTokenExpiredError,
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
} from 'src/iam/sessions/application/sessions.errors';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
} from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

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
        {
          provide: getLoggerToken(RotateSessionUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: RefreshTokensRepository, useValue: repository },
        { provide: RefreshTokenFactory, useValue: factory },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(60) },
        },
      ],
    }).compile();

    useCase = module.get(RotateSessionUseCase);
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

  it('preserves SSO provenance during rotation', async () => {
    const familyExpiresAt = new Date(Date.now() + 86_400_000);
    const current = aRefreshToken({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session-id',
      familyExpiresAt,
    });
    repository.findByTokenHash.mockResolvedValue(current);
    repository.markUsedAndInsertSuccessor.mockResolvedValue(true);

    await rotate();

    expect(factory.create).toHaveBeenCalledWith({
      userId: current.userId,
      familyId: current.familyId,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session-id',
      familyExpiresAt,
    });
  });

  it('keeps password session expiry sliding during rotation', async () => {
    const current = aRefreshToken({
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
    });
    repository.findByTokenHash.mockResolvedValue(current);
    repository.markUsedAndInsertSuccessor.mockResolvedValue(true);

    await rotate();

    expect(factory.create).toHaveBeenCalledWith({
      userId: current.userId,
      familyId: current.familyId,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
      familyExpiresAt: undefined,
    });
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
