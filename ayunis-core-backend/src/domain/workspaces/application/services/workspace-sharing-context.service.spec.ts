import { randomUUID } from 'crypto';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import type { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import {
  aWorkspace,
  createMockWorkspaceAccessService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import type { WorkspaceAccessService } from './workspace-access.service';
import type { WorkspaceDirectoryService } from './workspace-directory.service';
import type { WorkspaceLinkCleanupService } from './workspace-link-cleanup.service';
import { WorkspaceSharingContextService } from './workspace-sharing-context.service';

describe(WorkspaceSharingContextService.name, () => {
  it('locks the workspace before loading it for a change', async () => {
    const workspace = aWorkspace();
    const order: string[] = [];
    const workspaces = createMockWorkspacesRepository();
    workspaces.lockForUpdate.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve();
    });
    const access = createMockWorkspaceAccessService(workspace, 'owner');
    access.require.mockImplementation(() => {
      order.push('read');
      return Promise.resolve({ workspace, level: 'owner' });
    });
    const service = new WorkspaceSharingContextService(
      access as unknown as WorkspaceAccessService,
      {
        loadMany: jest.fn().mockResolvedValue(
          new Map([
            [
              workspace.id,
              new WorkspaceSharing({
                workspaceId: workspace.id,
                ownerId: TEST_USER_ID,
              }),
            ],
          ]),
        ),
      } as unknown as WorkspaceSharingRepository,
      {
        load: jest.fn().mockResolvedValue(new OrgDirectory([], [])),
      } as unknown as WorkspaceDirectoryService,
      {
        execute: jest.fn().mockResolvedValue({
          userId: TEST_USER_ID,
          orgId: randomUUID(),
          has: () => false,
          teamIdsWithAdminRight: () => [],
        }),
      } as unknown as GetOwnershipViewerUseCase,
      {} as WorkspaceLinkCleanupService,
      workspaces,
    );

    const context = await service.loadForChange(TEST_WORKSPACE_ID);

    expect(order).toEqual(['lock', 'read']);
    expect(workspaces.lockForUpdate).toHaveBeenCalledWith(TEST_WORKSPACE_ID);
    expect(context.workspace).toBe(workspace);
  });
});
