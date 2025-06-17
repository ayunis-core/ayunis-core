import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { FindUserByIdQuery } from './find-user-by-id.query';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';

describe('FindUserByIdUseCase', () => {
  let useCase: FindUserByIdUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByIdUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<FindUserByIdUseCase>(FindUserByIdUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should find user by ID successfully', async () => {
    const query = new FindUserByIdQuery('user-id' as any);
    const mockUser = new User({
      id: 'user-id' as any,
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as any,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);

    const result = await useCase.execute(query);

    expect(result).toBe(mockUser);
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
  });
});
