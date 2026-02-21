import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { RefreshTokenCommand } from './refresh-token.command';
import type { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdUseCase } from '../../../../users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { User } from '../../../../users/domain/user.entity';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { AuthTokens } from '../../../domain/auth-tokens.entity';
import { InvalidTokenError } from '../../authentication.errors';
import type { UUID } from 'crypto';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockAuthRepository: Partial<AuthenticationRepository>;
  let mockJwtService: Partial<JwtService>;
  let mockFindUserByIdUseCase: Partial<FindUserByIdUseCase>;

  beforeAll(async () => {
    mockAuthRepository = {
      generateTokens: jest.fn(),
    };
    mockJwtService = {
      verify: jest.fn(),
    };
    mockFindUserByIdUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        {
          provide: AUTHENTICATION_REPOSITORY,
          useValue: mockAuthRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: FindUserByIdUseCase, useValue: mockFindUserByIdUseCase },
      ],
    }).compile();

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should refresh token successfully', async () => {
    const command = new RefreshTokenCommand('valid-refresh-token');
    const mockUser = new User({
      id: 'user-id-123' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'name',
      hasAcceptedMarketing: false,
    });
    const mockTokens = new AuthTokens('new-access-token', 'new-refresh-token');

    jest
      .spyOn(mockJwtService, 'verify')
      .mockReturnValue({ sub: 'user-id-123' });
    jest.spyOn(mockFindUserByIdUseCase, 'execute').mockResolvedValue(mockUser);
    jest
      .spyOn(mockAuthRepository, 'generateTokens')
      .mockResolvedValue(mockTokens);

    const result = await useCase.execute(command);

    expect(result).toBe(mockTokens);
    expect(mockJwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
    expect(mockFindUserByIdUseCase.execute).toHaveBeenCalled();
    expect(mockAuthRepository.generateTokens).toHaveBeenCalled();
  });

  it('should throw InvalidTokenError for invalid token', async () => {
    const command = new RefreshTokenCommand('invalid-token');

    jest.spyOn(mockJwtService, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await expect(useCase.execute(command)).rejects.toThrow(InvalidTokenError);
  });
});
