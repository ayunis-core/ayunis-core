import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessService } from './workspace-access.service';

function setup() {
  const repository = createMockWorkspacesRepository();
  const context = createMockContextService();
  return {
    repository,
    context,
    service: new WorkspaceAccessService(repository, context),
  };
}

describe(WorkspaceAccessService.name, () => {
  it('allows an owned workspace using the authenticated user scope', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(aWorkspace());
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).resolves.toBeUndefined();
    expect(repository.findById).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_WORKSPACE_ID,
    );
  });

  it('rejects unauthenticated callers before querying persistence', async () => {
    const { service, repository, context } = setup();
    context.get.mockReturnValue(undefined);
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('rejects a workspace absent from the authenticated user scope', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(null);
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(repository.findById).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_WORKSPACE_ID,
    );
  });

  it('uses the current caller rather than a previously authorized owner', async () => {
    const { service, repository, context } = setup();
    repository.findById.mockImplementation(async (userId) =>
      userId === TEST_USER_ID ? aWorkspace() : null,
    );
    await service.requireOwned(TEST_WORKSPACE_ID);
    const otherUserId = randomUUID();
    context.get.mockReturnValue(otherUserId);
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(repository.findById).toHaveBeenLastCalledWith(
      otherUserId,
      TEST_WORKSPACE_ID,
    );
  });

  it('propagates repository failures to the use-case error boundary', async () => {
    const { service, repository } = setup();
    const error = new Error('Database unavailable');
    repository.findById.mockRejectedValue(error);
    await expect(service.requireOwned(TEST_WORKSPACE_ID)).rejects.toBe(error);
  });
});
