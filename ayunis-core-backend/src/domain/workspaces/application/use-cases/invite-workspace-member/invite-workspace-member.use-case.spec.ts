import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
  aWorkspace,
  createMockContextService,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { InviteWorkspaceMemberCommand } from './invite-workspace-member.command';
import { InviteWorkspaceMemberUseCase } from './invite-workspace-member.use-case';

const TARGET_USER_ID = '44444444-4444-4444-8444-444444444444' as const;

describe('InviteWorkspaceMemberUseCase', () => {
  it('creates a pending direct membership for a user in the caller organization', async () => {
    const repository = {
      createMember: jest
        .fn()
        .mockImplementation((member) => Promise.resolve(member)),
    };
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
    };
    const findUsers = {
      execute: jest
        .fn()
        .mockResolvedValue([{ id: TARGET_USER_ID, orgId: TEST_ORG_ID }]),
    };
    const module = await Test.createTestingModule({
      providers: [
        InviteWorkspaceMemberUseCase,
        { provide: WorkspaceMembersRepository, useValue: repository },
        { provide: WorkspaceAccessService, useValue: accessService },
        { provide: FindUsersByIdsUseCase, useValue: findUsers },
        { provide: ContextService, useValue: createMockContextService() },
        {
          provide: getLoggerToken(InviteWorkspaceMemberUseCase.name),
          useValue: { info: jest.fn() },
        },
      ],
    }).compile();
    const useCase = module.get(InviteWorkspaceMemberUseCase);

    await expect(
      useCase.execute(
        new InviteWorkspaceMemberCommand(
          TEST_WORKSPACE_ID,
          TARGET_USER_ID,
          WorkspaceRole.EDIT,
        ),
      ),
    ).resolves.toEqual({
      workspaceId: TEST_WORKSPACE_ID,
      userId: TARGET_USER_ID,
      role: WorkspaceRole.EDIT,
      status: WorkspaceMemberStatus.PENDING,
    });
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.FULL,
    );
  });

  it('rejects a target outside the caller organization', async () => {
    const useCase = new InviteWorkspaceMemberUseCase(
      { info: jest.fn() } as never,
      {} as never,
      {
        requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
      } as never,
      { execute: jest.fn().mockResolvedValue([]) } as never,
    );

    await expect(
      useCase.execute(
        new InviteWorkspaceMemberCommand(
          TEST_WORKSPACE_ID,
          TARGET_USER_ID,
          WorkspaceRole.EDIT,
        ),
      ),
    ).rejects.toThrow('Workspace members must belong to the same organization');
  });

  it('rejects a duplicate direct membership or invitation', async () => {
    const useCase = new InviteWorkspaceMemberUseCase(
      { info: jest.fn() } as never,
      { createMember: jest.fn().mockResolvedValue(null) } as never,
      {
        requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
      } as never,
      {
        execute: jest.fn().mockResolvedValue([{ id: TARGET_USER_ID }]),
      } as never,
    );

    await expect(
      useCase.execute(
        new InviteWorkspaceMemberCommand(
          TEST_WORKSPACE_ID,
          TARGET_USER_ID,
          WorkspaceRole.EDIT,
        ),
      ),
    ).rejects.toThrow('already has a direct workspace membership');
  });

  it('does not allow inviting the workspace owner', async () => {
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
    };
    const module = await Test.createTestingModule({
      providers: [
        InviteWorkspaceMemberUseCase,
        { provide: WorkspaceMembersRepository, useValue: {} },
        { provide: WorkspaceAccessService, useValue: accessService },
        { provide: FindUsersByIdsUseCase, useValue: {} },
        { provide: ContextService, useValue: createMockContextService() },
        {
          provide: getLoggerToken(InviteWorkspaceMemberUseCase.name),
          useValue: { info: jest.fn() },
        },
      ],
    }).compile();
    const useCase = module.get(InviteWorkspaceMemberUseCase);

    await expect(
      useCase.execute(
        new InviteWorkspaceMemberCommand(
          TEST_WORKSPACE_ID,
          TEST_USER_ID,
          WorkspaceRole.EDIT,
        ),
      ),
    ).rejects.toThrow('Workspace owner access cannot be changed');
  });
});
