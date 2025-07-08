import { Test, TestingModule } from '@nestjs/testing';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { GetCurrentUserCommand } from './get-current-user.command';
import { JwtService } from '@nestjs/jwt';
import { ActiveUser } from '../../../domain/active-user.entity';
import { InvalidTokenError } from '../../authentication.errors';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { UUID } from 'crypto';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let mockJwtService: Partial<JwtService>;

  beforeEach(async () => {
    mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentUserUseCase,
        { provide: JwtService, useValue: mockJwtService },
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
      role: UserRole.USER,
      orgId: 'org-id-123' as UUID,
    };

    jest.spyOn(mockJwtService, 'verify').mockReturnValue(mockPayload);

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
