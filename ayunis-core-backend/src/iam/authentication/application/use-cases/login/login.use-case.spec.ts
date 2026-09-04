jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { LoginCommand } from './login.command';
import type { AuthenticationRepository } from 'src/iam/authentication/application/ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from 'src/iam/authentication/application/tokens/authentication-repository.token';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import type { UUID } from 'crypto';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { AuthorizeUserLoginUseCase } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.use-case';
import { UserAuthenticationFailedError } from 'src/iam/users/application/users.errors';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { LocalPasswordLoginDisabledError } from 'src/iam/authentication/application/authentication.errors';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockAuthRepository: Partial<AuthenticationRepository>;
  let mockCreateSessionUseCase: { execute: jest.Mock };
  let authorizeUserLogin: { execute: jest.Mock };
  let mockLocalPasswordLoginPolicy: {
    assertSessionIssuanceAllowed: jest.Mock;
  };

  beforeAll(async () => {
    mockAuthRepository = {
      generateAccessToken: jest.fn(),
    };
    mockCreateSessionUseCase = { execute: jest.fn() };
    authorizeUserLogin = { execute: jest.fn().mockResolvedValue(undefined) };
    mockLocalPasswordLoginPolicy = {
      assertSessionIssuanceAllowed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: AUTHENTICATION_REPOSITORY, useValue: mockAuthRepository },
        { provide: CreateSessionUseCase, useValue: mockCreateSessionUseCase },
        {
          provide: AuthorizeUserLoginUseCase,
          useValue: authorizeUserLogin,
        },
        {
          provide: LocalPasswordLoginPolicyService,
          useValue: mockLocalPasswordLoginPolicy,
        },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    authorizeUserLogin.execute.mockResolvedValue(undefined);
    mockLocalPasswordLoginPolicy.assertSessionIssuanceAllowed.mockResolvedValue(
      undefined,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should compose an access token and an opaque session refresh token', async () => {
    const activeUser = new ActiveUser({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId: 'org-id' as UUID,
      name: 'name',
    });
    const command = new LoginCommand(
      activeUser,
      SessionAuthenticationMethod.SSO,
      'zitadel-session-id',
    );
    authorizeUserLogin.execute.mockResolvedValue(aUser(activeUser));

    jest
      .spyOn(mockAuthRepository, 'generateAccessToken')
      .mockResolvedValue('access-token');
    mockCreateSessionUseCase.execute.mockResolvedValue({
      refreshToken: 'opaque-refresh-token',
      expiresAt: new Date(),
    });

    const result = await useCase.execute(command);

    expect(result.access_token).toBe('access-token');
    expect(result.refresh_token).toBe('opaque-refresh-token');
    expect(authorizeUserLogin.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: activeUser.id }),
    );
    expect(mockAuthRepository.generateAccessToken).toHaveBeenCalledWith(
      activeUser,
    );
    expect(mockCreateSessionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: activeUser.id,
        authenticationMethod: SessionAuthenticationMethod.SSO,
        zitadelSessionId: 'zitadel-session-id',
      }),
    );
  });

  it('signs the access token from the authoritative user state', async () => {
    const submittedUser = createActiveUser();
    const currentUser = aUser({
      id: submittedUser.id,
      email: 'current@stadt.example',
      emailVerified: false,
      role: UserRole.MANAGER,
      systemRole: SystemRole.CUSTOMER,
      orgId: 'current-org-id' as UUID,
      name: 'Current User',
    });
    authorizeUserLogin.execute.mockResolvedValue(currentUser);
    mockCreateSessionUseCase.execute.mockResolvedValue({
      refreshToken: 'opaque-refresh-token',
      expiresAt: new Date(),
    });
    jest
      .spyOn(mockAuthRepository, 'generateAccessToken')
      .mockResolvedValue('access-token');

    await useCase.execute(
      new LoginCommand(submittedUser, SessionAuthenticationMethod.PASSWORD),
    );

    expect(
      mockLocalPasswordLoginPolicy.assertSessionIssuanceAllowed,
    ).toHaveBeenCalledWith(
      currentUser.orgId,
      SessionAuthenticationMethod.PASSWORD,
    );
    expect(mockAuthRepository.generateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        email: currentUser.email,
        emailVerified: false,
        role: UserRole.MANAGER,
        orgId: currentUser.orgId,
        name: currentUser.name,
      }),
    );
  });

  it('issues no tokens when account authorization fails', async () => {
    const activeUser = createActiveUser();
    authorizeUserLogin.execute.mockRejectedValue(
      new UserAuthenticationFailedError('Invalid credentials'),
    );

    await expect(
      useCase.execute(
        new LoginCommand(activeUser, SessionAuthenticationMethod.PASSWORD),
      ),
    ).rejects.toThrow(UserAuthenticationFailedError);
    expect(mockAuthRepository.generateAccessToken).not.toHaveBeenCalled();
    expect(mockCreateSessionUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects password session issuance before creating the session', async () => {
    const activeUser = createActiveUser();
    authorizeUserLogin.execute.mockResolvedValue(aUser(activeUser));
    mockLocalPasswordLoginPolicy.assertSessionIssuanceAllowed.mockRejectedValue(
      new LocalPasswordLoginDisabledError(),
    );
    mockCreateSessionUseCase.execute.mockResolvedValue({
      refreshToken: 'opaque-refresh-token',
      expiresAt: new Date(),
    });

    await expect(
      useCase.execute(
        new LoginCommand(activeUser, SessionAuthenticationMethod.PASSWORD),
      ),
    ).rejects.toBeInstanceOf(LocalPasswordLoginDisabledError);
    expect(mockCreateSessionUseCase.execute).not.toHaveBeenCalled();
    expect(mockAuthRepository.generateAccessToken).not.toHaveBeenCalled();
  });

  function createActiveUser(): ActiveUser {
    return new ActiveUser({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: true,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId: 'org-id' as UUID,
      name: 'name',
    });
  }
});
