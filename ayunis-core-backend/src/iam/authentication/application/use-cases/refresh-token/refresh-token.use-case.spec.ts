import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { RefreshTokenCommand } from './refresh-token.command';
import type { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { InvalidTokenError } from '../../authentication.errors';
import { RotateSessionUseCase } from 'src/iam/sessions/application/use-cases/rotate-session/rotate-session.use-case';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import { RefreshTokenReuseError } from 'src/iam/sessions/application/sessions.errors';
import type { UUID } from 'crypto';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockAuthRepository: Partial<AuthenticationRepository>;
  let mockJwtService: { verify: jest.Mock };
  let mockFindUserByIdUseCase: { execute: jest.Mock };
  let mockRotateSessionUseCase: { execute: jest.Mock };
  let mockCreateSessionUseCase: { execute: jest.Mock };

  const userId = 'user-id-123' as UUID;
  const opaqueToken = 'opaque-refresh-token-no-dots';
  const legacyJwt = 'header.payload.signature';

  const buildUser = () =>
    new User({
      id: userId,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'name',
      hasAcceptedMarketing: false,
    });

  beforeEach(async () => {
    mockAuthRepository = { generateAccessToken: jest.fn() };
    mockJwtService = { verify: jest.fn() };
    mockFindUserByIdUseCase = { execute: jest.fn() };
    mockRotateSessionUseCase = { execute: jest.fn() };
    mockCreateSessionUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: AUTHENTICATION_REPOSITORY, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: FindUserByIdUseCase, useValue: mockFindUserByIdUseCase },
        { provide: RotateSessionUseCase, useValue: mockRotateSessionUseCase },
        { provide: CreateSessionUseCase, useValue: mockCreateSessionUseCase },
      ],
    }).compile();

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);

    jest
      .spyOn(mockAuthRepository, 'generateAccessToken')
      .mockResolvedValue('new-access-token');
    mockFindUserByIdUseCase.execute.mockResolvedValue(buildUser());
  });

  afterEach(() => jest.clearAllMocks());

  it('should rotate an opaque token and return a new token pair', async () => {
    mockRotateSessionUseCase.execute.mockResolvedValue({
      userId,
      refreshToken: 'rotated-refresh-token',
    });

    const result = await useCase.execute(new RefreshTokenCommand(opaqueToken));

    expect(result.access_token).toBe('new-access-token');
    expect(result.refresh_token).toBe('rotated-refresh-token');
    expect(mockRotateSessionUseCase.execute).toHaveBeenCalled();
    expect(mockJwtService.verify).not.toHaveBeenCalled();
  });

  it('should propagate a reuse error un-flattened (theft response)', async () => {
    mockRotateSessionUseCase.execute.mockRejectedValue(
      new RefreshTokenReuseError(),
    );

    await expect(
      useCase.execute(new RefreshTokenCommand(opaqueToken)),
    ).rejects.toThrow(RefreshTokenReuseError);
  });

  it('should migrate a valid legacy JWT refresh token to an opaque session', async () => {
    mockJwtService.verify.mockReturnValue({ sub: userId, type: 'refresh' });
    mockCreateSessionUseCase.execute.mockResolvedValue({
      refreshToken: 'migrated-refresh-token',
      expiresAt: new Date(),
    });

    const result = await useCase.execute(new RefreshTokenCommand(legacyJwt));

    expect(result.refresh_token).toBe('migrated-refresh-token');
    expect(mockCreateSessionUseCase.execute).toHaveBeenCalled();
    expect(mockRotateSessionUseCase.execute).not.toHaveBeenCalled();
  });

  it('should migrate a bare {sub} legacy refresh token', async () => {
    mockJwtService.verify.mockReturnValue({ sub: userId });
    mockCreateSessionUseCase.execute.mockResolvedValue({
      refreshToken: 'migrated',
      expiresAt: new Date(),
    });

    await expect(
      useCase.execute(new RefreshTokenCommand(legacyJwt)),
    ).resolves.toBeDefined();
    expect(mockCreateSessionUseCase.execute).toHaveBeenCalled();
  });

  it('should reject a legacy JWT that is access-shaped (carries email)', async () => {
    mockJwtService.verify.mockReturnValue({ sub: userId, email: 'x@y.z' });

    await expect(
      useCase.execute(new RefreshTokenCommand(legacyJwt)),
    ).rejects.toThrow(InvalidTokenError);
    expect(mockCreateSessionUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject a legacy JWT typed as a foreign token', async () => {
    mockJwtService.verify.mockReturnValue({ sub: userId, type: 'mfa_pending' });

    await expect(
      useCase.execute(new RefreshTokenCommand(legacyJwt)),
    ).rejects.toThrow(InvalidTokenError);
  });

  it('should wrap a malformed JWT verification failure as InvalidTokenError', async () => {
    mockJwtService.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await expect(
      useCase.execute(new RefreshTokenCommand(legacyJwt)),
    ).rejects.toThrow(InvalidTokenError);
  });
});
