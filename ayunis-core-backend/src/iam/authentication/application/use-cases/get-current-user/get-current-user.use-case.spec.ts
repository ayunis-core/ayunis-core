import { Test, TestingModule } from '@nestjs/testing';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { GetCurrentUserCommand } from './get-current-user.command';
import { JwtService } from '@nestjs/jwt';
import { ActiveUser } from '../../../domain/active-user.entity';
import { InvalidTokenError } from '../../authentication.errors';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let mockJwtService: Partial<JwtService>;
  let mockFindUserByIdUseCase: Partial<FindUserByIdUseCase>;

  beforeEach(async () => {
    mockJwtService = { verify: jest.fn() };
    mockFindUserByIdUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentUserUseCase,
        { provide: JwtService, useValue: mockJwtService },
        { provide: FindUserByIdUseCase, useValue: mockFindUserByIdUseCase },
      ],
    }).compile();

    useCase = module.get<GetCurrentUserUseCase>(GetCurrentUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return user information from valid token', async () => {
    const command = new GetCurrentUserCommand('valid-access-token');
    const mockPayload = {
      sub: 'user-id-123' as UUID,
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.USER,
      orgId: 'org-id-123' as UUID,
    };

    jest.spyOn(mockJwtService, 'verify').mockReturnValue(mockPayload);
    (mockFindUserByIdUseCase.execute as jest.Mock).mockResolvedValue({
      id: mockPayload.sub,
      email: mockPayload.email,
      emailVerified: false,
      role: mockPayload.role,
      orgId: mockPayload.orgId,
      name: mockPayload.name,
    });

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(ActiveUser);
    expect(result.id).toBe(mockPayload.sub);
    expect(result.email).toBe(mockPayload.email);
    expect(result.role).toBe(mockPayload.role);
    expect(result.orgId).toBe(mockPayload.orgId);
    expect(mockJwtService.verify).toHaveBeenCalledWith('valid-access-token');
  });

  it('should throw InvalidTokenError for invalid token', async () => {
    const command = new GetCurrentUserCommand('invalid-token');

    jest.spyOn(mockJwtService, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await expect(useCase.execute(command)).rejects.toThrow(InvalidTokenError);
  });

  it('should throw InvalidTokenError for token with missing payload fields', async () => {
    const command = new GetCurrentUserCommand('incomplete-token');
    const mockPayload = {
      sub: 'user-id-123' as UUID,
      email: 'test@example.com',
      // Missing role and orgId
    };

    jest.spyOn(mockJwtService, 'verify').mockReturnValue(mockPayload);

    await expect(useCase.execute(command)).rejects.toThrow(InvalidTokenError);
  });
});
