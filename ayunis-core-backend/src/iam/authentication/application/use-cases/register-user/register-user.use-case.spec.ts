import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUserUseCase } from './register-user.use-case';
import { RegisterUserCommand } from './register-user.command';
import { CreateAdminUserUseCase } from '../../../../users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { IsValidPasswordUseCase } from '../../../../users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { CreateOrgUseCase } from '../../../../orgs/application/use-cases/create-org/create-org.use-case';
import { User } from '../../../../users/domain/user.entity';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { Org } from '../../../../orgs/domain/org.entity';
import { ActiveUser } from '../../../domain/active-user.entity';
import {
  InvalidPasswordError,
  AuthenticationFailedError,
} from '../../authentication.errors';
import { UUID } from 'crypto';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockCreateAdminUserUseCase: Partial<CreateAdminUserUseCase>;
  let mockIsValidPasswordUseCase: Partial<IsValidPasswordUseCase>;
  let mockCreateOrgUseCase: Partial<CreateOrgUseCase>;

  beforeEach(async () => {
    mockCreateAdminUserUseCase = {
      execute: jest.fn(),
    };
    mockIsValidPasswordUseCase = {
      execute: jest.fn(),
    };
    mockCreateOrgUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
        {
          provide: CreateAdminUserUseCase,
          useValue: mockCreateAdminUserUseCase,
        },
        {
          provide: IsValidPasswordUseCase,
          useValue: mockIsValidPasswordUseCase,
        },
        { provide: CreateOrgUseCase, useValue: mockCreateOrgUseCase },
      ],
    }).compile();

    useCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should register user successfully', async () => {
    const command = new RegisterUserCommand({
      userName: 'test',
      email: 'test@example.com',
      password: 'validPassword123',
      orgName: 'Test Org',
    });
    const mockOrg = new Org({ id: 'org-id' as UUID, name: 'Test Org' });
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.ADMIN,
      orgId: 'org-id' as UUID,
      name: 'test',
    });

    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);
    jest.spyOn(mockCreateOrgUseCase, 'execute').mockResolvedValue(mockOrg);
    jest
      .spyOn(mockCreateAdminUserUseCase, 'execute')
      .mockResolvedValue(mockUser);

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(ActiveUser);
    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
    expect(result.role).toBe(mockUser.role);
    expect(result.orgId).toBe(mockUser.orgId);
    expect(mockIsValidPasswordUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'validPassword123' }),
    );
    expect(mockCreateOrgUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Org' }),
    );
    expect(mockCreateAdminUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password: 'validPassword123',
        orgId: 'org-id',
      }),
    );
  });

  it('should throw InvalidPasswordError for invalid password', async () => {
    const command = new RegisterUserCommand({
      userName: 'test',
      email: 'test@example.com',
      password: 'weak',
      orgName: 'Test Org',
    });

    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(false);

    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidPasswordError,
    );
  });

  it('should throw AuthenticationFailedError for unexpected errors', async () => {
    const command = new RegisterUserCommand({
      userName: 'test',
      email: 'test@example.com',
      password: 'validPassword123',
      orgName: 'Test Org',
    });

    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);
    jest
      .spyOn(mockCreateOrgUseCase, 'execute')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      AuthenticationFailedError,
    );
  });
});
