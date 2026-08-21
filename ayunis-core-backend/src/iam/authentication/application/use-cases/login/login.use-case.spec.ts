import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { LoginCommand } from './login.command';
import type { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import type { UUID } from 'crypto';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockAuthRepository: Partial<AuthenticationRepository>;
  let mockCreateSessionUseCase: { execute: jest.Mock };

  beforeAll(async () => {
    mockAuthRepository = {
      generateAccessToken: jest.fn(),
    };
    mockCreateSessionUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: AUTHENTICATION_REPOSITORY, useValue: mockAuthRepository },
        { provide: CreateSessionUseCase, useValue: mockCreateSessionUseCase },
        {
          provide: getLoggerToken(LoginUseCase.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
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
});
