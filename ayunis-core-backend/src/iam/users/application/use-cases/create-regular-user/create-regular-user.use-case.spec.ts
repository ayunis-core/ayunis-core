import { Test, TestingModule } from '@nestjs/testing';
import { CreateRegularUserUseCase } from './create-regular-user.use-case';
import { CreateRegularUserCommand } from './create-regular-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UserAlreadyExistsError } from '../../users.errors';
import { UUID } from 'crypto';
import { CreateUserUseCase } from '../create-user/create-user.use-case';

describe('CreateRegularUserUseCase', () => {
  let useCase: CreateRegularUserUseCase;
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
        CreateRegularUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
        { provide: CreateUserUseCase, useValue: mockCreateUserUseCase },
      ],
    }).compile();

    useCase = module.get<CreateRegularUserUseCase>(CreateRegularUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create regular user successfully', async () => {
    const command = new CreateRegularUserCommand({
      email: 'test@example.com',
      password: 'password123',
      orgId: 'org-id' as UUID,
      name: 'Regular User',
      emailVerified: false,
      hasAcceptedMarketing: false,
    });
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Regular User',
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

  it('should throw UserAlreadyExistsError if user exists', async () => {
    const command = new CreateRegularUserCommand({
      email: 'test@example.com',
      password: 'password123',
      orgId: 'org-id' as UUID,
      name: 'Regular User',
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
