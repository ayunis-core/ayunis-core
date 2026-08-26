import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { SetWorkspaceTeamMemberOverrideCommand } from './set-workspace-team-member-override.command';
import { SetWorkspaceTeamMemberOverrideUseCase } from './set-workspace-team-member-override.use-case';

describe('SetWorkspaceTeamMemberOverrideUseCase', () => {
  it('sets an access-level override for a member of the granted team', async () => {
    const repository = {
      hasTeamGrant: jest.fn().mockResolvedValue(true),
      upsertOverride: jest.fn().mockResolvedValue({
        teamGrantId: 'grant-id',
        userId: TEST_USER_ID,
        accessLevel: WorkspaceAccessLevel.FULL,
        excluded: false,
      }),
    };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const membershipUseCase = { execute: jest.fn().mockResolvedValue(true) };
    const useCase = new SetWorkspaceTeamMemberOverrideUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
      membershipUseCase as never,
    );

    await expect(
      useCase.execute(
        new SetWorkspaceTeamMemberOverrideCommand(
          TEST_WORKSPACE_ID,
          TEST_TEAM_ID,
          TEST_USER_ID,
          { accessLevel: WorkspaceAccessLevel.FULL, excluded: false },
        ),
      ),
    ).resolves.toEqual(
      expect.objectContaining({ accessLevel: WorkspaceAccessLevel.FULL }),
    );
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
  });

  it('rejects a user outside the granted team', async () => {
    const useCase = new SetWorkspaceTeamMemberOverrideUseCase(
      { info: jest.fn() } as never,
      { hasTeamGrant: jest.fn().mockResolvedValue(true) } as never,
      { requireAccessLevel: jest.fn().mockResolvedValue({}) } as never,
      { execute: jest.fn().mockResolvedValue(false) } as never,
    );

    await expect(
      useCase.execute(
        new SetWorkspaceTeamMemberOverrideCommand(
          TEST_WORKSPACE_ID,
          TEST_TEAM_ID,
          TEST_USER_ID,
          { accessLevel: null, excluded: true },
        ),
      ),
    ).rejects.toThrow('must belong to the granted team');
  });

  it('rejects a missing team grant before checking team membership', async () => {
    const membershipUseCase = { execute: jest.fn() };
    const useCase = new SetWorkspaceTeamMemberOverrideUseCase(
      { info: jest.fn() } as never,
      { hasTeamGrant: jest.fn().mockResolvedValue(false) } as never,
      { requireAccessLevel: jest.fn().mockResolvedValue({}) } as never,
      membershipUseCase as never,
    );

    await expect(
      useCase.execute(
        new SetWorkspaceTeamMemberOverrideCommand(
          TEST_WORKSPACE_ID,
          TEST_TEAM_ID,
          TEST_USER_ID,
          { accessLevel: null, excluded: true },
        ),
      ),
    ).rejects.toThrow('Workspace team grant not found');
    expect(membershipUseCase.execute).not.toHaveBeenCalled();
  });
});
