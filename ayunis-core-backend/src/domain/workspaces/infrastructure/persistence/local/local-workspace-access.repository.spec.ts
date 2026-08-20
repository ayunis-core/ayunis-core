import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { WorkspaceMapper } from 'src/domain/workspaces/infrastructure/persistence/local/mappers/workspace.mapper';
import { LocalWorkspaceAccessRepository } from 'src/domain/workspaces/infrastructure/persistence/local/local-workspace-access.repository';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { WorkspaceTeamGrantRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-member-override.record';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import {
  aWorkspace,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';

const TEAM_ID = '44444444-4444-4444-8444-444444444444' as UUID;
const TEAM_GRANT_ID = '55555555-5555-4555-8555-555555555555' as UUID;

describe('LocalWorkspaceAccessRepository', () => {
  const workspaceRepo = { findOne: jest.fn() };
  const memberRepo = { findOne: jest.fn() };
  const teamGrantRepo = { find: jest.fn() };
  const overrideRepo = { find: jest.fn() };
  const mapper = { toDomain: jest.fn() };
  let repository: LocalWorkspaceAccessRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
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
      role: WorkspaceRole.USE,
      status: WorkspaceMemberStatus.ACTIVE,
    });
    teamGrantRepo.find.mockResolvedValue([
      { id: TEAM_GRANT_ID, teamId: TEAM_ID, role: WorkspaceRole.EDIT },
    ]);
    overrideRepo.find.mockResolvedValue([
      {
        teamGrantId: TEAM_GRANT_ID,
        role: WorkspaceRole.FULL,
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
        role: WorkspaceRole.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      teamGrants: [
        {
          teamId: TEAM_ID,
          role: WorkspaceRole.EDIT,
          override: { role: WorkspaceRole.FULL, excluded: false },
        },
      ],
    });
    expect(workspaceRepo.findOne).toHaveBeenCalledWith({
      where: { id: TEST_WORKSPACE_ID, orgId: TEST_ORG_ID },
    });
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
