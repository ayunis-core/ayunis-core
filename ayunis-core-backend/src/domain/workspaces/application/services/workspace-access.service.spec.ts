import { getLoggerToken } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspaceAccessRepository } from 'src/domain/workspaces/application/ports/workspace-access-repository.port';
import {
  WorkspaceInsufficientAccessLevelError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceAccessPolicyService } from './workspace-access-policy.service';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
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
  const repository = { findAccessSnapshot: jest.fn() };
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

  it('resolves the highest access level from direct and team access', async () => {
    repository.findAccessSnapshot.mockResolvedValue({
      workspace: aWorkspace({ userId: randomUUID() }),
      directMembership: {
        accessLevel: WorkspaceAccessLevel.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      teamGrants: [{ teamId: TEAM_ID, accessLevel: WorkspaceAccessLevel.EDIT }],
    });

    await expect(service.resolve(TEST_WORKSPACE_ID)).resolves.toMatchObject({
      accessLevel: WorkspaceAccessLevel.EDIT,
      sources: [{ type: 'direct' }, { type: 'team', teamId: TEAM_ID }],
    });
    expect(repository.findAccessSnapshot).toHaveBeenCalledWith({
      workspaceId: TEST_WORKSPACE_ID,
      orgId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      teamIds: [TEAM_ID],
    });
  });

  it('rejects an accessible workspace when the access level is insufficient', async () => {
    repository.findAccessSnapshot.mockResolvedValue({
      workspace: aWorkspace({ userId: randomUUID() }),
      directMembership: {
        accessLevel: WorkspaceAccessLevel.USE,
        status: WorkspaceMemberStatus.ACTIVE,
      },
      teamGrants: [],
    });

    await expect(
      service.requireAccessLevel(TEST_WORKSPACE_ID, WorkspaceAccessLevel.EDIT),
    ).rejects.toBeInstanceOf(WorkspaceInsufficientAccessLevelError);
  });

  it('hides a workspace when the caller has no access', async () => {
    repository.findAccessSnapshot.mockResolvedValue({
      workspace: aWorkspace({ userId: randomUUID() }),
      teamGrants: [],
    });

    await expect(
      service.requireAccessLevel(TEST_WORKSPACE_ID, WorkspaceAccessLevel.USE),
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
