import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceSharingController } from './workspace-sharing.controller';
import { WorkspaceTeamGrantMembersController } from './workspace-team-grant-members.controller';
import { WorkspaceTeamGrantsController } from './workspace-team-grants.controller';

describe('workspace sharing HTTP controllers', () => {
  it('maps sharing reads and visibility updates', async () => {
    const access = {
      execute: jest.fn().mockResolvedValue({
        role: WorkspaceRole.FULL,
        sources: [{ type: 'owner' }],
      }),
    };
    const sharing = { execute: jest.fn().mockResolvedValue({ members: [] }) };
    const visibility = { execute: jest.fn().mockResolvedValue(undefined) };
    const mapper = { toSharingDto: jest.fn().mockReturnValue({ members: [] }) };
    const controller = new WorkspaceSharingController(
      access as never,
      sharing as never,
      visibility as never,
      mapper as never,
    );

    await expect(controller.getAccess(TEST_WORKSPACE_ID)).resolves.toEqual({
      role: WorkspaceRole.FULL,
      isOwner: true,
    });
    await expect(controller.getSharing(TEST_WORKSPACE_ID)).resolves.toEqual({
      members: [],
    });
    await controller.updateVisibility(TEST_WORKSPACE_ID, {
      visibility: WorkspaceVisibility.ORGANIZATION,
    });

    expect(sharing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: TEST_WORKSPACE_ID }),
    );
    expect(visibility.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: TEST_WORKSPACE_ID,
        visibility: WorkspaceVisibility.ORGANIZATION,
      }),
    );
  });

  it('maps direct member lifecycle commands', async () => {
    const invite = { execute: jest.fn().mockResolvedValue(undefined) };
    const update = { execute: jest.fn().mockResolvedValue(undefined) };
    const remove = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new WorkspaceMembersController(
      invite as never,
      update as never,
      remove as never,
    );

    await controller.invite(TEST_WORKSPACE_ID, {
      userId: TEST_USER_ID,
      role: WorkspaceRole.USE,
    });
    await controller.updateRole(TEST_WORKSPACE_ID, TEST_USER_ID, {
      role: WorkspaceRole.EDIT,
    });
    await controller.remove(TEST_WORKSPACE_ID, TEST_USER_ID);

    expect(invite.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        role: WorkspaceRole.USE,
      }),
    );
    expect(update.execute).toHaveBeenCalledWith(
      expect.objectContaining({ role: WorkspaceRole.EDIT }),
    );
    expect(remove.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USER_ID }),
    );
  });

  it('maps team grant and override lifecycle commands', async () => {
    const add = { execute: jest.fn().mockResolvedValue(undefined) };
    const update = { execute: jest.fn().mockResolvedValue(undefined) };
    const remove = { execute: jest.fn().mockResolvedValue(undefined) };
    const setOverride = { execute: jest.fn().mockResolvedValue(undefined) };
    const resetOverride = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = new WorkspaceTeamGrantsController(
      add as never,
      update as never,
      remove as never,
      setOverride as never,
      resetOverride as never,
    );

    await controller.add(TEST_WORKSPACE_ID, {
      teamId: TEST_TEAM_ID,
      role: WorkspaceRole.USE,
    });
    await controller.updateRole(TEST_WORKSPACE_ID, TEST_TEAM_ID, {
      role: WorkspaceRole.EDIT,
    });
    await controller.remove(TEST_WORKSPACE_ID, TEST_TEAM_ID);
    await controller.setOverride(
      TEST_WORKSPACE_ID,
      TEST_TEAM_ID,
      TEST_USER_ID,
      { role: null },
    );
    await controller.resetOverride(
      TEST_WORKSPACE_ID,
      TEST_TEAM_ID,
      TEST_USER_ID,
    );

    expect(add.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: TEST_TEAM_ID,
        role: WorkspaceRole.USE,
      }),
    );
    expect(update.execute).toHaveBeenCalledWith(
      expect.objectContaining({ role: WorkspaceRole.EDIT }),
    );
    expect(remove.execute).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: TEST_TEAM_ID }),
    );
    expect(setOverride.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: { role: null, excluded: true } }),
    );
    expect(resetOverride.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USER_ID }),
    );
  });

  it('maps granted team members to safe user DTOs', async () => {
    const list = {
      execute: jest.fn().mockResolvedValue([{ id: TEST_USER_ID }]),
    };
    const mapper = {
      toUserDtos: jest.fn().mockReturnValue([{ id: TEST_USER_ID }]),
    };
    const controller = new WorkspaceTeamGrantMembersController(
      list as never,
      mapper as never,
    );

    await expect(
      controller.list(TEST_WORKSPACE_ID, TEST_TEAM_ID),
    ).resolves.toEqual([{ id: TEST_USER_ID }]);
    expect(list.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: TEST_WORKSPACE_ID,
        teamId: TEST_TEAM_ID,
      }),
    );
  });

  it('maps the current user invitation lifecycle', async () => {
    const list = { execute: jest.fn().mockResolvedValue([{ role: 'use' }]) };
    const accept = { execute: jest.fn().mockResolvedValue(undefined) };
    const decline = { execute: jest.fn().mockResolvedValue(undefined) };
    const mapper = {
      toInvitationDto: jest.fn().mockReturnValue({ role: 'use' }),
    };
    const controller = new WorkspaceInvitationsController(
      list as never,
      accept as never,
      decline as never,
      mapper as never,
    );

    await expect(controller.list()).resolves.toEqual([{ role: 'use' }]);
    await controller.accept(TEST_WORKSPACE_ID);
    await controller.decline(TEST_WORKSPACE_ID);

    expect(accept.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: TEST_WORKSPACE_ID }),
    );
    expect(decline.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: TEST_WORKSPACE_ID }),
    );
  });
});
