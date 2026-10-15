import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import type { WorkspaceSummaryService } from 'src/domain/workspaces/application/services/workspace-summary.service';
import {
  aWorkspace,
  createMockWorkspaceAccessService,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { FindWorkspaceQuery } from './find-workspace.query';
import { FindWorkspaceUseCase } from './find-workspace.use-case';

function setup() {
  const workspace = aWorkspace();
  const access = createMockWorkspaceAccessService(workspace, 'edit');
  const summaries = {
    detail: jest
      .fn()
      .mockImplementation(({ level }) =>
        Promise.resolve({ workspace, accessLevel: level, memberCount: 3 }),
      ),
  };
  return {
    workspace,
    access,
    useCase: new FindWorkspaceUseCase(
      access as unknown as WorkspaceAccessService,
      summaries as unknown as WorkspaceSummaryService,
    ),
  };
}

describe(FindWorkspaceUseCase.name, () => {
  it('returns the workspace with the caller’s level and the member count', async () => {
    const { useCase, workspace, access } = setup();

    await expect(
      useCase.execute(new FindWorkspaceQuery(TEST_WORKSPACE_ID)),
    ).resolves.toEqual({ workspace, accessLevel: 'edit', memberCount: 3 });
    expect(access.require).toHaveBeenCalledWith(TEST_WORKSPACE_ID, 'use');
  });

  it('keeps the not-found answer for people without access', async () => {
    const { useCase, access } = setup();
    access.require.mockRejectedValue(
      new WorkspaceNotFoundError(TEST_WORKSPACE_ID),
    );

    await expect(
      useCase.execute(new FindWorkspaceQuery(TEST_WORKSPACE_ID)),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });
});
