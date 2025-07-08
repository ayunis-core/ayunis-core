import { Test, TestingModule } from '@nestjs/testing';
import { FindUsersByOrgIdUseCase } from './find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UUID } from 'crypto';

describe('FindUsersByOrgIdUseCase', () => {
  let useCase: FindUsersByOrgIdUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      findManyByOrgId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUsersByOrgIdUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<FindUsersByOrgIdUseCase>(FindUsersByOrgIdUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should find users by org ID successfully', async () => {
    const query = new FindUsersByOrgIdQuery('org-id' as UUID);
    const mockUsers = [
      new User({
        id: 'user-1' as UUID,
        email: 'user1@example.com',
        passwordHash: 'hash1',
        role: UserRole.USER,
        orgId: 'org-id' as UUID,
        name: 'User One',
      }),
      new User({
        id: 'user-2' as UUID,
        email: 'user2@example.com',
        passwordHash: 'hash2',
        role: UserRole.USER,
        orgId: 'org-id' as UUID,
        name: 'User Two',
      }),
    ];

    jest
      .spyOn(mockUsersRepository, 'findManyByOrgId')
      .mockResolvedValue(mockUsers);

    const result = await useCase.execute(query);

    expect(result).toBe(mockUsers);
    expect(result).toHaveLength(2);
    expect(mockUsersRepository.findManyByOrgId).toHaveBeenCalledWith('org-id');
  });

  it('should return empty array when no users found for org ID', async () => {
    const query = new FindUsersByOrgIdQuery('org-id' as UUID);

    jest.spyOn(mockUsersRepository, 'findManyByOrgId').mockResolvedValue([]);

    const result = await useCase.execute(query);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
    expect(mockUsersRepository.findManyByOrgId).toHaveBeenCalledWith('org-id');
  });
});
