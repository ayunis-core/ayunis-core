import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { GetCurrentUserCommand } from './get-current-user.command';
import { JwtService } from '@nestjs/jwt';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let mockJwtService: Partial<JwtService>;
  let mockFindUserByIdUseCase: Partial<FindUserByIdUseCase>;

  beforeAll(async () => {
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it.each([
    { client: undefined, expectedClient: null },
    { client: 'outlook', expectedClient: 'outlook' },
  ])(
    'loads the user and preserves the verified session client $client',
    async ({ client, expectedClient }) => {
      const command = new GetCurrentUserCommand('valid-access-token');
      const mockPayload = {
        sub: 'user-id-123' as UUID,
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        orgId: 'org-id-123' as UUID,
        client,
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
      expect(result.client).toBe(expectedClient);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-access-token');
    },
  );

  it('should throw InvalidTokenError for invalid token', async () => {
    const command = new GetCurrentUserCommand('invalid-token');

    jest.spyOn(mockJwtService, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await expect(useCase.execute(command)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects an unknown client claim', async () => {
    jest.spyOn(mockJwtService, 'verify').mockReturnValue({
      sub: 'user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.USER,
      orgId: 'org-id-123',
      client: 'retired-client',
    });

    await expect(
      useCase.execute(new GetCurrentUserCommand('token-for-retired-client')),
    ).rejects.toThrow(InvalidTokenError);
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
