import { Test, TestingModule } from '@nestjs/testing';
import { CreateAdminUserUseCase } from './create-admin-user.use-case';
import { CreateAdminUserCommand } from './create-admin-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
} from '../../users.errors';

describe('CreateAdminUserUseCase', () => {
  let useCase: CreateAdminUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockHashTextUseCase: Partial<HashTextUseCase>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneByEmail: jest.fn(),
      create: jest.fn(),
    };
    mockHashTextUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAdminUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
      ],
    }).compile();

    useCase = module.get<CreateAdminUserUseCase>(CreateAdminUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create admin user successfully', async () => {
    const command = new CreateAdminUserCommand(
      'admin@example.com',
      'password123',
      'org-id' as any,
    );
    const mockUser = new User({
      id: 'user-id' as any,
      email: 'admin@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.ADMIN,
      orgId: 'org-id' as any,
    });

    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);
    jest
      .spyOn(mockHashTextUseCase, 'execute')
      .mockResolvedValue('hashedPassword');
    jest.spyOn(mockUsersRepository, 'create').mockResolvedValue(mockUser);

    const result = await useCase.execute(command);

    expect(result).toBe(mockUser);
    expect(mockUsersRepository.findOneByEmail).toHaveBeenCalledWith(
      'admin@example.com',
    );
    expect(mockHashTextUseCase.execute).toHaveBeenCalled();
    expect(mockUsersRepository.create).toHaveBeenCalledWith(expect.any(User));
  });

  it('should throw UserAlreadyExistsError when user exists', async () => {
    const command = new CreateAdminUserCommand(
      'admin@example.com',
      'password123',
      'org-id' as any,
    );
    const existingUser = new User({
      id: 'existing-id' as any,
      email: 'admin@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as any,
    });

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(existingUser);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserAlreadyExistsError,
    );
  });
});
