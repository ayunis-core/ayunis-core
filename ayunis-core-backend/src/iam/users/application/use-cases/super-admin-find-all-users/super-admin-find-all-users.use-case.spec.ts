import { Test, type TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserUnauthorizedError } from 'src/iam/users/application/users.errors';
import type { SuperAdminUserListItem } from 'src/iam/users/domain/super-admin-user-list-item';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SortOrder } from 'src/common/sorting/sort';
import { SuperAdminUsersSortField } from 'src/iam/users/domain/value-objects/super-admin-users-sort.enum';
import { SuperAdminFindAllUsersQuery } from './super-admin-find-all-users.query';
import { SuperAdminFindAllUsersUseCase } from './super-admin-find-all-users.use-case';

describe('SuperAdminFindAllUsersUseCase', () => {
  let useCase: SuperAdminFindAllUsersUseCase;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findAllForSuperAdmin'>
  >;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminFindAllUsersUseCase,
        {
          provide: UsersRepository,
          useValue: { findAllForSuperAdmin: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SuperAdminFindAllUsersUseCase);
    usersRepository = module.get(UsersRepository);
    contextService = module.get(ContextService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the requested page of users with their organizations', async () => {
    const page = new Paginated<SuperAdminUserListItem>({
      data: [],
      limit: 25,
      offset: 50,
      total: 73,
    });
    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    usersRepository.findAllForSuperAdmin.mockResolvedValue(page);

    const result = await useCase.execute(
      new SuperAdminFindAllUsersQuery({
        search: 'alex@example.de',
        pagination: { limit: 25, offset: 50 },
        sortBy: SuperAdminUsersSortField.ORG_NAME,
        sortOrder: SortOrder.ASC,
      }),
    );

    expect(result).toBe(page);
    expect(usersRepository.findAllForSuperAdmin).toHaveBeenCalledWith(
      { limit: 25, offset: 50 },
      { search: 'alex@example.de' },
      {
        field: SuperAdminUsersSortField.ORG_NAME,
        order: SortOrder.ASC,
      },
    );
  });

  it('defaults to newest users first when no sort is requested', async () => {
    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    usersRepository.findAllForSuperAdmin.mockResolvedValue(
      new Paginated<SuperAdminUserListItem>({
        data: [],
        limit: 25,
        offset: 0,
        total: 0,
      }),
    );

    await useCase.execute(new SuperAdminFindAllUsersQuery());

    expect(usersRepository.findAllForSuperAdmin).toHaveBeenCalledWith(
      { limit: 25, offset: 0 },
      { search: undefined },
      {
        field: SuperAdminUsersSortField.CREATED_AT,
        order: SortOrder.DESC,
      },
    );
  });

  it('rejects non-super-admin requesters', async () => {
    contextService.get.mockReturnValue(SystemRole.CUSTOMER);

    await expect(
      useCase.execute(new SuperAdminFindAllUsersQuery()),
    ).rejects.toThrow(UserUnauthorizedError);
    expect(usersRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });
});
