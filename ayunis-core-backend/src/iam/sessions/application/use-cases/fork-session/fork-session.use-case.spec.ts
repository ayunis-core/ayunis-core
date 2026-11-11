import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshTokenFactory } from 'src/iam/sessions/application/services/refresh-token.factory';
import { RefreshTokenReuseError } from 'src/iam/sessions/application/sessions.errors';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
} from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { ForkSessionCommand } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.command';
import { ForkSessionUseCase } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe(ForkSessionUseCase.name, () => {
  const forkFamilyId = '55555555-5555-5555-5555-555555555555' as UUID;
  let useCase: ForkSessionUseCase;
  let repository: jest.Mocked<RefreshTokensRepository>;
  let factory: { create: jest.Mock; newFamilyId: jest.Mock };

  beforeEach(async () => {
    repository = createMockRefreshTokensRepository();
    factory = {
      create: jest.fn().mockReturnValue({
        token: aRefreshToken({ id: 'fork-id' as never }),
        plaintext: 'fork-plaintext',
      }),
      newFamilyId: jest.fn().mockReturnValue(forkFamilyId),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForkSessionUseCase,
        { provide: RefreshTokensRepository, useValue: repository },
        { provide: RefreshTokenFactory, useValue: factory },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(60) },
        },
      ],
    }).compile();
    useCase = module.get(ForkSessionUseCase);
  });

  // Rotating the browser's family instead would sign the web app out when
  // the Office dialog shares its cookies (Outlook on the web).
  it('starts a new client family and leaves the presented session alone', async () => {
    const current = aRefreshToken({ client: null });

    const result = await useCase.execute(
      new ForkSessionCommand(current, 'outlook'),
    );

    expect(result).toEqual({
      userId: current.userId,
      refreshToken: 'fork-plaintext',
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      client: 'outlook',
    });
    expect(factory.create).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: forkFamilyId, client: 'outlook' }),
    );
    expect(repository.insertForkIfSourceValid).toHaveBeenCalledWith(
      current.id,
      expect.objectContaining({ id: 'fork-id' }),
      60,
    );
    expect(repository.markUsedAndInsertSuccessor).not.toHaveBeenCalled();
    expect(repository.revokeFamily).not.toHaveBeenCalled();
  });

  it('keeps SSO provenance and the family expiry of the presented session', async () => {
    const familyExpiresAt = new Date(Date.now() + 3_600_000);
    const current = aRefreshToken({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session-id',
      familyExpiresAt,
    });

    await useCase.execute(new ForkSessionCommand(current, 'outlook'));

    expect(factory.create).toHaveBeenCalledWith({
      userId: current.userId,
      familyId: forkFamilyId,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session-id',
      familyExpiresAt,
      client: 'outlook',
    });
  });

  it('forks a token rotated within the grace window', async () => {
    repository.wasUsedWithinGrace.mockResolvedValue(true);

    await expect(
      useCase.execute(
        new ForkSessionCommand(
          aRefreshToken({ usedAt: new Date() }),
          'outlook',
        ),
      ),
    ).resolves.toBeDefined();
    expect(repository.insertForkIfSourceValid).toHaveBeenCalledTimes(1);
  });

  it('reports a token rotated before the grace window as reuse', async () => {
    repository.wasUsedWithinGrace.mockResolvedValue(false);

    await expect(
      useCase.execute(
        new ForkSessionCommand(
          aRefreshToken({ usedAt: new Date(0) }),
          'outlook',
        ),
      ),
    ).rejects.toBeInstanceOf(RefreshTokenReuseError);
    expect(repository.insertForkIfSourceValid).not.toHaveBeenCalled();
  });

  it('reports revocation that wins the fork race as reuse', async () => {
    repository.insertForkIfSourceValid.mockResolvedValue(false);

    await expect(
      useCase.execute(
        new ForkSessionCommand(aRefreshToken({ usedAt: null }), 'outlook'),
      ),
    ).rejects.toBeInstanceOf(RefreshTokenReuseError);
  });
});
