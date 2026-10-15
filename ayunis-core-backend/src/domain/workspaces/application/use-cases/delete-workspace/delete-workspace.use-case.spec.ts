import type { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import {
  WorkspaceNotFoundError,
  WorkspaceOwnerOnlyError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import {
  aWorkspace,
  createMockWorkspaceAccessService,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { DeleteWorkspaceCommand } from './delete-workspace.command';
import { DeleteWorkspaceUseCase } from './delete-workspace.use-case';

function setup(level: WorkspaceAccessLevel = 'owner') {
  const repository: jest.Mocked<WorkspacesRepository> =
    createMockWorkspacesRepository();
  const access = createMockWorkspaceAccessService(aWorkspace(), level);
  const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
  const useCase = new DeleteWorkspaceUseCase(
    repository,
    access as unknown as WorkspaceAccessService,
    new WorkspaceDeletionService(
      repository,
      eventEmitter as unknown as EventEmitter2,
    ),
  );
  return { useCase, repository, access, eventEmitter };
}

function deleteWorkspace(useCase: DeleteWorkspaceUseCase): Promise<void> {
  return useCase.execute(new DeleteWorkspaceCommand(TEST_WORKSPACE_ID));
}

describe('DeleteWorkspaceUseCase', () => {
  it('announces the deletion before removing the row', async () => {
    const { useCase, repository, eventEmitter } = setup();
    const callOrder: string[] = [];
    eventEmitter.emitAsync.mockImplementation(() => {
      callOrder.push('event');
      return Promise.resolve([]);
    });
    repository.delete.mockImplementation(() => {
      callOrder.push('delete');
      return Promise.resolve();
    });

    await deleteWorkspace(useCase);

    expect(callOrder).toEqual(['event', 'delete']);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      expect.objectContaining({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      }),
    );
  });

  it('runs deferred listener cleanup only after the row delete succeeds', async () => {
    const { useCase, repository, eventEmitter } = setup();
    const cleanup = jest.fn().mockResolvedValue(undefined);
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: WorkspaceDeletionRequestedEvent) => {
        event.deferCleanup('purge thread storage', cleanup);
        return Promise.resolve([]);
      },
    );

    await deleteWorkspace(useCase);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(repository.delete).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_WORKSPACE_ID,
    );
  });

  it('does not run cleanup when the row delete fails', async () => {
    const { useCase, repository, eventEmitter } = setup();
    const cleanup = jest.fn().mockResolvedValue(undefined);
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: WorkspaceDeletionRequestedEvent) => {
        event.deferCleanup('purge thread storage', cleanup);
        return Promise.resolve([]);
      },
    );
    repository.delete.mockRejectedValue(new Error('constraint violation'));

    await expect(deleteWorkspace(useCase)).rejects.toThrow();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it.each<WorkspaceAccessLevel>(['full', 'edit', 'use'])(
    'refuses members with %s access and leaves the workspace alone',
    async (level) => {
      const { useCase, repository, eventEmitter } = setup(level);

      await expect(deleteWorkspace(useCase)).rejects.toBeInstanceOf(
        WorkspaceOwnerOnlyError,
      );
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    },
  );

  it('keeps the not-found answer for people without access', async () => {
    const { useCase, repository, access, eventEmitter } = setup();
    access.require.mockRejectedValue(
      new WorkspaceNotFoundError(TEST_WORKSPACE_ID),
    );

    await expect(deleteWorkspace(useCase)).rejects.toBeInstanceOf(
      WorkspaceNotFoundError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
