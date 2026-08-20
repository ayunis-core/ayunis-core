import { getLoggerToken } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspaceAccessRepository } from 'src/domain/workspaces/application/ports/workspace-access-repository.port';
import {
  WorkspaceInsufficientRoleError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceAccessPolicyService } from './workspace-access-policy.service';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';
import type { Team } from 'src/iam/teams/domain/team.entity';
import {
  aWorkspace,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';

const TEAM_ID = '44444444-4444-4444-8444-444444444444' as UUID;

describe('WorkspaceAccessService', () => {
  const repository = {
    findAccessSnapshot: jest.fn(),
    findAccessSnapshots: jest.fn(),
  };
  const listMyTeams = { execute: jest.fn() };
  const contextService = { get: jest.fn() };
  let service: WorkspaceAccessService;

  beforeEach(async () => {
    jest.clearAllMocks();
    contextService.get.mockImplementation((key: string) => {
      if (key === 'userId') return TEST_USER_ID;
      if (key === 'orgId') return TEST_ORG_ID;
      return undefined;
    });
    listMyTeams.execute.mockResolvedValue([{ id: TEAM_ID }] as Team[]);

    const module = await Test.createTestingModule({
      providers: [
        WorkspaceAccessService,
        WorkspaceAccessPolicyService,
        { provide: WorkspaceAccessRepository, useValue: repository },
        { provide: ListMyTeamsUseCase, useValue: listMyTeams },
        { provide: ContextService, useValue: contextService },
        {
          provide: getLoggerToken(WorkspaceAccessService.name),
          useValue: { info: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WorkspaceAccessService);
  });

  it('resolves the highest role from direct and team access', async () => {
    repository.findAccessSnapshot.mockResolvedValue({
      workspace: aWorkspace({ userId: randomUUID() }),
      directMembership: {
        role: WorkspaceRole.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      teamGrants: [{ teamId: TEAM_ID, role: WorkspaceRole.EDIT }],
    });

    await expect(service.resolve(TEST_WORKSPACE_ID)).resolves.toMatchObject({
      role: WorkspaceRole.EDIT,
      sources: [{ type: 'direct' }, { type: 'team', teamId: TEAM_ID }],
    });
    expect(repository.findAccessSnapshot).toHaveBeenCalledWith({
      workspaceId: TEST_WORKSPACE_ID,
      orgId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      teamIds: [TEAM_ID],
    });
  });

  it('lists accessible workspaces with their effective roles in one batch', async () => {
    const workspace = aWorkspace({ userId: randomUUID() });
    repository.findAccessSnapshots.mockResolvedValue(
      new Paginated({
        data: [
          {
            workspace,
            directMembership: {
              role: WorkspaceRole.USE,
              status: WorkspaceMemberStatus.ACTIVE,
            },
            teamGrants: [{ teamId: TEAM_ID, role: WorkspaceRole.EDIT }],
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );

    await expect(
      service.findAllAccessible({ limit: 20, offset: 0, sort: 'updatedAt' }),
    ).resolves.toEqual(
      new Paginated({
        data: [
          expect.objectContaining({ workspace, role: WorkspaceRole.EDIT }),
        ],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );
    expect(repository.findAccessSnapshots).toHaveBeenCalledWith(
      {
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        teamIds: [TEAM_ID],
      },
      { limit: 20, offset: 0, sort: 'updatedAt' },
    );
  });

  it('rejects an accessible workspace when the role is insufficient', async () => {
    repository.findAccessSnapshot.mockResolvedValue({
      workspace: aWorkspace({ userId: randomUUID() }),
      directMembership: {
        role: WorkspaceRole.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      teamGrants: [],
    });

    await expect(
      service.requireRole(TEST_WORKSPACE_ID, WorkspaceRole.EDIT),
    ).rejects.toBeInstanceOf(WorkspaceInsufficientRoleError);
  });

  it('hides a workspace when the caller has no access', async () => {
    repository.findAccessSnapshot.mockResolvedValue({
      workspace: aWorkspace({ userId: randomUUID() }),
      teamGrants: [],
    });

    await expect(
      service.requireRole(TEST_WORKSPACE_ID, WorkspaceRole.USE),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('rejects missing request context before querying access', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(service.resolve(TEST_WORKSPACE_ID)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    expect(repository.findAccessSnapshot).not.toHaveBeenCalled();
  });
});
