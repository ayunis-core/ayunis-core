import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { WorkspaceMapper } from 'src/domain/workspaces/infrastructure/persistence/local/mappers/workspace.mapper';
import { LocalWorkspaceAccessRepository } from 'src/domain/workspaces/infrastructure/persistence/local/local-workspace-access.repository';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { WorkspaceTeamGrantRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-member-override.record';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import {
  aWorkspace,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';

const TEAM_ID = '44444444-4444-4444-8444-444444444444' as UUID;
const TEAM_GRANT_ID = '55555555-5555-4555-8555-555555555555' as UUID;

const createQueryBuilder = () => ({
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getCount: jest.fn(),
});

describe('LocalWorkspaceAccessRepository', () => {
  let listQueryBuilder = createQueryBuilder();
  let countQueryBuilder = createQueryBuilder();
  const workspaceRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const memberRepo = { findOne: jest.fn(), find: jest.fn() };
  const teamGrantRepo = { find: jest.fn() };
  const overrideRepo = { find: jest.fn() };
  const mapper = { toDomain: jest.fn() };
  let repository: LocalWorkspaceAccessRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    listQueryBuilder = createQueryBuilder();
    countQueryBuilder = createQueryBuilder();
    workspaceRepo.createQueryBuilder
      .mockReset()
      .mockReturnValueOnce(listQueryBuilder)
      .mockReturnValueOnce(countQueryBuilder);
    const module = await Test.createTestingModule({
      providers: [
        LocalWorkspaceAccessRepository,
        {
          provide: getRepositoryToken(WorkspaceRecord),
          useValue: workspaceRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceMemberRecord),
          useValue: memberRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceTeamGrantRecord),
          useValue: teamGrantRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceTeamMemberOverrideRecord),
          useValue: overrideRepo,
        },
        { provide: WorkspaceMapper, useValue: mapper },
      ],
    }).compile();
    repository = module.get(LocalWorkspaceAccessRepository);
  });

  it('returns direct and team access candidates within the organization', async () => {
    const workspace = aWorkspace();
    const workspaceRecord = { id: TEST_WORKSPACE_ID } as WorkspaceRecord;
    workspaceRepo.findOne.mockResolvedValue(workspaceRecord);
    mapper.toDomain.mockReturnValue(workspace);
    memberRepo.findOne.mockResolvedValue({
      accessLevel: WorkspaceAccessLevel.USE,
      status: WorkspaceMemberStatus.ACTIVE,
    });
    teamGrantRepo.find.mockResolvedValue([
      {
        id: TEAM_GRANT_ID,
        teamId: TEAM_ID,
        accessLevel: WorkspaceAccessLevel.EDIT,
      },
    ]);
    overrideRepo.find.mockResolvedValue([
      {
        teamGrantId: TEAM_GRANT_ID,
        accessLevel: WorkspaceAccessLevel.FULL,
        excluded: false,
      },
    ]);

    await expect(
      repository.findAccessSnapshot({
        workspaceId: TEST_WORKSPACE_ID,
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        teamIds: [TEAM_ID],
      }),
    ).resolves.toEqual({
      workspace,
      directMembership: {
        accessLevel: WorkspaceAccessLevel.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      teamGrants: [
        {
          teamId: TEAM_ID,
          accessLevel: WorkspaceAccessLevel.EDIT,
          override: { accessLevel: WorkspaceAccessLevel.FULL, excluded: false },
        },
      ],
    });
    expect(workspaceRepo.findOne).toHaveBeenCalledWith({
      where: { id: TEST_WORKSPACE_ID, orgId: TEST_ORG_ID },
    });
  });

  it('lists and hydrates accessible workspaces with batched access queries', async () => {
    const workspace = aWorkspace({
      userId: randomUUID(),
      visibility: WorkspaceVisibility.PRIVATE,
    });
    const workspaceRecord = {
      id: TEST_WORKSPACE_ID,
    } as WorkspaceRecord;
    listQueryBuilder.getMany.mockResolvedValue([workspaceRecord]);
    countQueryBuilder.getCount.mockResolvedValue(1);
    mapper.toDomain.mockReturnValue(workspace);
    memberRepo.find.mockResolvedValue([
      {
        workspaceId: TEST_WORKSPACE_ID,
        accessLevel: WorkspaceAccessLevel.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
    ]);
    teamGrantRepo.find.mockResolvedValue([
      {
        id: TEAM_GRANT_ID,
        workspaceId: TEST_WORKSPACE_ID,
        teamId: TEAM_ID,
        accessLevel: WorkspaceAccessLevel.EDIT,
      },
    ]);
    overrideRepo.find.mockResolvedValue([]);

    await expect(
      repository.findAccessSnapshots(
        { orgId: TEST_ORG_ID, userId: TEST_USER_ID, teamIds: [TEAM_ID] },
        { limit: 20, offset: 0, sort: 'updatedAt' },
      ),
    ).resolves.toMatchObject({
      data: [
        {
          workspace,
          directMembership: {
            accessLevel: WorkspaceAccessLevel.USE,
            status: WorkspaceMemberStatus.ACTIVE,
          },
          teamGrants: [
            { teamId: TEAM_ID, accessLevel: WorkspaceAccessLevel.EDIT },
          ],
        },
      ],
      total: 1,
    });
    expect(listQueryBuilder.addSelect).toHaveBeenCalledWith(
      expect.any(String),
      'effective_activity_at',
    );
    expect(listQueryBuilder.orderBy).toHaveBeenCalledWith(
      'effective_activity_at',
      'DESC',
    );
    expect(countQueryBuilder.leftJoin).not.toHaveBeenCalled();
    expect(countQueryBuilder.getCount).toHaveBeenCalled();
    expect(memberRepo.find).toHaveBeenCalledTimes(1);
    expect(teamGrantRepo.find).toHaveBeenCalledTimes(1);
    expect(overrideRepo.find).toHaveBeenCalledTimes(1);
  });

  it('hydrates accessible workspaces requested by id in one batch', async () => {
    const workspace = aWorkspace();
    listQueryBuilder.getMany.mockResolvedValue([
      { id: TEST_WORKSPACE_ID } as WorkspaceRecord,
    ]);
    mapper.toDomain.mockReturnValue(workspace);
    memberRepo.find.mockResolvedValue([]);
    teamGrantRepo.find.mockResolvedValue([]);

    await expect(
      repository.findAccessSnapshotsByIds(
        { orgId: TEST_ORG_ID, userId: TEST_USER_ID, teamIds: [] },
        [TEST_WORKSPACE_ID],
      ),
    ).resolves.toEqual([{ workspace, teamGrants: [] }]);
    expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
      'workspace.id IN (:...workspaceIds)',
      { workspaceIds: [TEST_WORKSPACE_ID] },
    );
  });

  it('does not join threads when sorting does not use activity', async () => {
    listQueryBuilder.getMany.mockResolvedValue([]);
    countQueryBuilder.getCount.mockResolvedValue(0);

    await repository.findAccessSnapshots(
      { orgId: TEST_ORG_ID, userId: TEST_USER_ID, teamIds: [] },
      { limit: 20, offset: 0, sort: 'name' },
    );

    expect(listQueryBuilder.leftJoin).not.toHaveBeenCalled();
    expect(listQueryBuilder.addGroupBy).not.toHaveBeenCalled();
    expect(listQueryBuilder.orderBy).toHaveBeenCalledWith(
      'LOWER(workspace.name)',
      'ASC',
    );
  });

  it('returns null without querying grants when the workspace is outside the org', async () => {
    workspaceRepo.findOne.mockResolvedValue(null);

    await expect(
      repository.findAccessSnapshot({
        workspaceId: TEST_WORKSPACE_ID,
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        teamIds: [TEAM_ID],
      }),
    ).resolves.toBeNull();
    expect(memberRepo.findOne).not.toHaveBeenCalled();
    expect(teamGrantRepo.find).not.toHaveBeenCalled();
  });
});
