import { Test, TestingModule } from '@nestjs/testing';
import { ValidateUserUseCase } from './validate-user.use-case';
import { ValidateUserQuery } from './validate-user.query';
import { UsersRepository } from '../../ports/users.repository';
import { CompareHashUseCase } from '../../../../hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import {
  UserNotFoundError,
  UserAuthenticationFailedError,
} from '../../users.errors';

describe('ValidateUserUseCase', () => {
  let useCase: ValidateUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockCompareHashUseCase: Partial<CompareHashUseCase>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneByEmail: jest.fn(),
    };
    mockCompareHashUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: CompareHashUseCase, useValue: mockCompareHashUseCase },
      ],
    }).compile();

    useCase = module.get<ValidateUserUseCase>(ValidateUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should validate user successfully', async () => {
    const query = new ValidateUserQuery('test@example.com', 'password123');
    const mockUser = new User({
      id: 'user-id' as any,
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      orgId: 'org-id' as any,
    });

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);
    jest.spyOn(mockCompareHashUseCase, 'execute').mockResolvedValue(true);

    const result = await useCase.execute(query);

    expect(result).toBe(mockUser);
    expect(mockUsersRepository.findOneByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(mockCompareHashUseCase.execute).toHaveBeenCalled();
  });

  it('should throw UserNotFoundError if user not found', async () => {
    const query = new ValidateUserQuery('test@example.com', 'password123');

    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);

    await expect(useCase.execute(query)).rejects.toThrow(UserNotFoundError);
  });

  it('should throw UserAuthenticationFailedError if password is invalid', async () => {
    const query = new ValidateUserQuery('test@example.com', 'wrongpassword');
    const mockUser = new User({
      id: 'user-id' as any,
      email: 'test@example.com',
      passwordHash: 'hashedPassword',
      role: UserRole.USER,
      orgId: 'org-id' as any,
    });

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);
    jest.spyOn(mockCompareHashUseCase, 'execute').mockResolvedValue(false);

    await expect(useCase.execute(query)).rejects.toThrow(
      UserAuthenticationFailedError,
    );
  });
});
