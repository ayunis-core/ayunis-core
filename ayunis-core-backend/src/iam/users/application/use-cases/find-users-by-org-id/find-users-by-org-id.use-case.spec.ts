import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindUsersByOrgIdUseCase } from './find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import { Paginated } from 'src/common/pagination/paginated.entity';

describe('FindUsersByOrgIdUseCase', () => {
  let useCase: FindUsersByOrgIdUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockContextService: any;

  beforeEach(async () => {
    mockUsersRepository = {
      findManyByOrgId: jest.fn(),
    };

    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUsersByOrgIdUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<FindUsersByOrgIdUseCase>(FindUsersByOrgIdUseCase);

    // Configure ContextService mock to return ADMIN role
    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.ADMIN;
      return null;
    });
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should find users by org ID successfully', async () => {
    const orgId = 'org-id' as UUID;
    const query = new FindUsersByOrgIdQuery({ orgId });
    const mockUsers = [
      new User({
        id: 'user-1' as UUID,
        email: 'user1@example.com',
        emailVerified: false,
        passwordHash: 'hash1',
        role: UserRole.USER,
        orgId: orgId,
        name: 'User One',
        hasAcceptedMarketing: false,
      }),
      new User({
        id: 'user-2' as UUID,
        email: 'user2@example.com',
        emailVerified: false,
        passwordHash: 'hash2',
        role: UserRole.USER,
        orgId: orgId,
        name: 'User Two',
        hasAcceptedMarketing: false,
      }),
    ];

    const paginatedResult = new Paginated<User>({
      data: mockUsers,
      limit: 25,
      offset: 0,
      total: 2,
    });

    jest
      .spyOn(mockUsersRepository, 'findManyByOrgId')
      .mockResolvedValue(paginatedResult);

    const result = await useCase.execute(query);

    expect(result.data).toEqual(mockUsers);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockUsersRepository.findManyByOrgId).toHaveBeenCalledWith(
      orgId,
      { limit: 25, offset: 0 },
      { search: undefined },
    );
  });

  it('should return empty array when no users found for org ID', async () => {
    const orgId = 'org-id' as UUID;
    const query = new FindUsersByOrgIdQuery({ orgId });

    const paginatedResult = new Paginated<User>({
      data: [],
      limit: 25,
      offset: 0,
      total: 0,
    });

    jest
      .spyOn(mockUsersRepository, 'findManyByOrgId')
      .mockResolvedValue(paginatedResult);

    const result = await useCase.execute(query);

    expect(result.data).toEqual([]);
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(mockUsersRepository.findManyByOrgId).toHaveBeenCalledWith(
      orgId,
      { limit: 25, offset: 0 },
      { search: undefined },
    );
  });
});
