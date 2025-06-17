import { Test, TestingModule } from '@nestjs/testing';
import { CreateRegularUserUseCase } from './create-regular-user.use-case';
import { CreateRegularUserCommand } from './create-regular-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
} from '../../users.errors';

describe('CreateRegularUserUseCase', () => {
  let useCase: CreateRegularUserUseCase;
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
        CreateRegularUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
      ],
    }).compile();

    useCase = module.get<CreateRegularUserUseCase>(CreateRegularUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create regular user successfully', async () => {
    const command = new CreateRegularUserCommand(
      'test@example.com',
      'password123',
      'org-id' as any,
    );
    const mockUser = new User({
      id: 'user-id' as any,
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
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
      'test@example.com',
    );
    expect(mockHashTextUseCase.execute).toHaveBeenCalled();
    expect(mockUsersRepository.create).toHaveBeenCalled();
  });

  it('should throw UserAlreadyExistsError if user exists', async () => {
    const command = new CreateRegularUserCommand(
      'test@example.com',
      'password123',
      'org-id' as any,
    );
    const existingUser = new User({
      id: 'existing-id' as any,
      email: 'test@example.com',
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
