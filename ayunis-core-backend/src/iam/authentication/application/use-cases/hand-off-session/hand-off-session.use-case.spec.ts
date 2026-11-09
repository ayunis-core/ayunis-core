jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { LocalPasswordLoginDisabledError } from 'src/iam/authentication/application/authentication.errors';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { AUTHENTICATION_REPOSITORY } from 'src/iam/authentication/application/tokens/authentication-repository.token';
import { HandOffSessionCommand } from 'src/iam/authentication/application/use-cases/hand-off-session/hand-off-session.command';
import { HandOffSessionUseCase } from 'src/iam/authentication/application/use-cases/hand-off-session/hand-off-session.use-case';
import {
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
} from 'src/iam/sessions/application/sessions.errors';
import { aRefreshToken } from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { ForkSessionUseCase } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.use-case';
import { PrepareSessionRotationUseCase } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.use-case';
import { RevokeSessionFamilyCommand } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.command';
import { RevokeSessionFamilyUseCase } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(HandOffSessionUseCase.name, () => {
  const userId = 'user-id-123' as UUID;
  const browserToken = 'dialog-refresh-token';
  const authRepository = { generateAccessToken: jest.fn() };
  const findUser = { execute: jest.fn() };
  const prepare = { execute: jest.fn() };
  const fork = { execute: jest.fn() };
  const revokeFamily = { execute: jest.fn() };
  const policy = { assertSessionIssuanceAllowed: jest.fn() };
  let useCase: HandOffSessionUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandOffSessionUseCase,
        { provide: AUTHENTICATION_REPOSITORY, useValue: authRepository },
        { provide: FindUserByIdUseCase, useValue: findUser },
        { provide: PrepareSessionRotationUseCase, useValue: prepare },
        { provide: ForkSessionUseCase, useValue: fork },
        { provide: RevokeSessionFamilyUseCase, useValue: revokeFamily },
        { provide: LocalPasswordLoginPolicyService, useValue: policy },
      ],
    }).compile();
    useCase = module.get(HandOffSessionUseCase);

    prepare.execute.mockResolvedValue(aRefreshToken({ userId }));
    findUser.execute.mockResolvedValue(
      new User({
        id: userId,
        email: 'pane@example.com',
        emailVerified: true,
        passwordHash: 'hash',
        role: UserRole.USER,
        orgId: 'org-id' as UUID,
        name: 'Pane User',
        hasAcceptedMarketing: false,
      }),
    );
    policy.assertSessionIssuanceAllowed.mockResolvedValue(0);
    fork.execute.mockResolvedValue({
      userId,
      refreshToken: 'pane-refresh-token',
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      client: 'outlook',
    });
    authRepository.generateAccessToken.mockResolvedValue('pane-access-jwt');
  });

  afterEach(() => jest.clearAllMocks());

  const handOff = () =>
    useCase.execute(new HandOffSessionCommand(browserToken, 'outlook'));

  it('issues client-bound tokens from a fork of the browser session', async () => {
    const tokens = await handOff();

    expect(tokens.access_token).toBe('pane-access-jwt');
    expect(tokens.refresh_token).toBe('pane-refresh-token');
    expect(fork.execute).toHaveBeenCalledWith(
      expect.objectContaining({ client: 'outlook' }),
    );
    expect(authRepository.generateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: userId, client: 'outlook' }),
      0,
    );
    expect(revokeFamily.execute).not.toHaveBeenCalled();
  });

  it('issues nothing for an unknown browser session', async () => {
    prepare.execute.mockRejectedValue(new RefreshTokenNotFoundError());

    await expect(handOff()).rejects.toBeInstanceOf(RefreshTokenNotFoundError);
    expect(fork.execute).not.toHaveBeenCalled();
    expect(authRepository.generateAccessToken).not.toHaveBeenCalled();
  });

  it('issues nothing when the organisation no longer allows the session', async () => {
    policy.assertSessionIssuanceAllowed.mockRejectedValue(
      new LocalPasswordLoginDisabledError(),
    );

    await expect(handOff()).rejects.toBeInstanceOf(
      LocalPasswordLoginDisabledError,
    );
    expect(fork.execute).not.toHaveBeenCalled();
  });

  it('revokes the browser family when its token is replayed', async () => {
    fork.execute.mockRejectedValue(new RefreshTokenReuseError());

    await expect(handOff()).rejects.toBeInstanceOf(RefreshTokenReuseError);
    expect(revokeFamily.execute).toHaveBeenCalledWith(
      new RevokeSessionFamilyCommand(browserToken),
    );
  });
});
