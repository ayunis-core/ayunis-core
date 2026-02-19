import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateAdminUserUseCase } from './create-admin-user.use-case';
import { CreateAdminUserCommand } from './create-admin-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UserAlreadyExistsError } from '../../users.errors';
import type { UUID } from 'crypto';
import { CreateUserUseCase } from '../create-user/create-user.use-case';

describe('CreateAdminUserUseCase', () => {
  let useCase: CreateAdminUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockHashTextUseCase: Partial<HashTextUseCase>;
  let mockCreateUserUseCase: Partial<CreateUserUseCase>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneByEmail: jest.fn(),
      create: jest.fn(),
    };
    mockHashTextUseCase = {
      execute: jest.fn(),
    };
    mockCreateUserUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAdminUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
        { provide: CreateUserUseCase, useValue: mockCreateUserUseCase },
      ],
    }).compile();

    useCase = module.get<CreateAdminUserUseCase>(CreateAdminUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create admin user successfully', async () => {
    const command = new CreateAdminUserCommand({
      email: 'admin@example.com',
      password: 'password123',
      orgId: 'org-id' as UUID,
      name: 'Admin User',
      emailVerified: false,
      hasAcceptedMarketing: false,
    });
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'admin@example.com',
      emailVerified: false,
      passwordHash: 'hashedPassword',
      role: UserRole.ADMIN,
      orgId: 'org-id' as UUID,
      name: 'Admin User',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);
    jest
      .spyOn(mockHashTextUseCase, 'execute')
      .mockResolvedValue('hashedPassword');
    jest.spyOn(mockCreateUserUseCase, 'execute').mockResolvedValue(mockUser);

    const result = await useCase.execute(command);

    expect(result).toBe(mockUser);
    expect(mockCreateUserUseCase.execute).toHaveBeenCalled();
    expect(mockCreateUserUseCase.execute).toHaveBeenCalled();
  });

  it('should throw UserAlreadyExistsError when user exists', async () => {
    const command = new CreateAdminUserCommand({
      email: 'admin@example.com',
      password: 'password123',
      orgId: 'org-id' as UUID,
      name: 'Admin User',
      emailVerified: false,
      hasAcceptedMarketing: false,
    });

    jest
      .spyOn(mockCreateUserUseCase, 'execute')
      .mockRejectedValue(new UserAlreadyExistsError('User already exists'));

    await expect(useCase.execute(command)).rejects.toThrow(
      UserAlreadyExistsError,
    );
  });
});
