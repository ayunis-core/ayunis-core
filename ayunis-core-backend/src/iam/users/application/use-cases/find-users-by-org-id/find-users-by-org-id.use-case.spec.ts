import { FindTeamsByUserIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-ids-and-org-id/find-teams-by-user-ids-and-org-id.use-case';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindUsersByOrgIdUseCase } from './find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { FindAdministeredTeamIdsUseCase } from 'src/iam/teams/application/use-cases/find-administered-team-ids/find-administered-team-ids.use-case';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('FindUsersByOrgIdUseCase', () => {
  let useCase: FindUsersByOrgIdUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockContextService: { get: jest.Mock };
  const mockFindAdministeredTeamIds = { execute: jest.fn() };
  const mockGetTeamAdminPermissions = { execute: jest.fn() };

  beforeAll(async () => {
    mockUsersRepository = {
      findManyByOrgId: jest.fn(),
    };

    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUsersByOrgIdUseCase,
        {
          provide: FindTeamsByUserIdsAndOrgIdUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: HasPermissionUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: FindAdministeredTeamIdsUseCase,
          useValue: mockFindAdministeredTeamIds,
        },
        {
          provide: GetTeamAdminPermissionsUseCase,
          useValue: mockGetTeamAdminPermissions,
        },
      ],
    }).compile();

    useCase = module.get<FindUsersByOrgIdUseCase>(FindUsersByOrgIdUseCase);

    // Configure ContextService mock to return ADMIN role
    mockContextService.get.mockImplementation((key: string): unknown => {
      if (key === 'userId') return 'requesting-user-id';
      if (key === 'orgId') return 'org-id';
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.ADMIN;
      return null;
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('member picker access for non-admins', () => {
    const orgId = 'org-id' as UUID;

    beforeEach(() => {
      mockContextService.get.mockImplementation((key: string): unknown => {
        if (key === 'userId') return 'requesting-user-id';
        if (key === 'orgId') return orgId;
        if (key === 'systemRole') return SystemRole.CUSTOMER;
        if (key === 'role') return UserRole.USER;
        return null;
      });
      jest
        .spyOn(mockUsersRepository, 'findManyByOrgId')
        .mockResolvedValue(
          new Paginated<User>({ data: [], limit: 25, offset: 0, total: 0 }),
        );
    });

    it('lets a team admin list org users', async () => {
      mockFindAdministeredTeamIds.execute.mockResolvedValue(['team-1']);
      mockGetTeamAdminPermissions.execute.mockResolvedValue([
        TeamAdminPermission.TEAM_MANAGE_MEMBERS,
      ]);

      await expect(
        useCase.execute(new FindUsersByOrgIdQuery({ orgId })),
      ).resolves.toHaveProperty('total', 0);
    });

    it('rejects a team admin while team admins may not manage members', async () => {
      mockFindAdministeredTeamIds.execute.mockResolvedValue(['team-1']);
      mockGetTeamAdminPermissions.execute.mockResolvedValue([]);

      await expect(
        useCase.execute(new FindUsersByOrgIdQuery({ orgId })),
      ).rejects.toThrow(UnauthorizedAccessError);
    });

    it('rejects a member who neither assigns users nor administers a team', async () => {
      mockFindAdministeredTeamIds.execute.mockResolvedValue([]);
      mockGetTeamAdminPermissions.execute.mockResolvedValue([
        TeamAdminPermission.TEAM_MANAGE_MEMBERS,
      ]);

      await expect(
        useCase.execute(new FindUsersByOrgIdQuery({ orgId })),
      ).rejects.toThrow(UnauthorizedAccessError);
    });
  });
});
