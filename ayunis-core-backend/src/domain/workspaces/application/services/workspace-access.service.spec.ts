import { randomUUID } from 'crypto';
import type { ConfigType } from '@nestjs/config';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { featuresConfig } from 'src/config/features.config';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessService } from './workspace-access.service';

function setup(workspacesEnabled = true) {
  const repository = createMockWorkspacesRepository();
  const context = createMockContextService();
  const features = {
    workspacesEnabled,
  } as ConfigType<typeof featuresConfig>;
  return {
    repository,
    context,
    service: new WorkspaceAccessService(repository, context, features),
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

  it('hides workspace access while the feature is disabled', async () => {
    const { service, repository } = setup(false);

    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers before querying persistence', async () => {
    const { service, repository, context } = setup();
    context.get.mockReturnValue(undefined);
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('requires authenticated organization context before querying persistence', async () => {
    const { service, repository, context } = setup();
    context.get.mockImplementation((key) =>
      key === 'userId' ? TEST_USER_ID : undefined,
    );
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('hides a workspace outside the active organization', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(aWorkspace({ orgId: randomUUID() }));
    await expect(
      service.requireOwned(TEST_WORKSPACE_ID),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
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
