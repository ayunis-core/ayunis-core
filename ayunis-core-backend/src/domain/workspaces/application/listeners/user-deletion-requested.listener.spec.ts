import type { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import type { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import type { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import {
  aWorkspace,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { WorkspacesUserDeletionRequestedListener } from './user-deletion-requested.listener';

describe(WorkspacesUserDeletionRequestedListener.name, () => {
  const shared = aWorkspace({ id: randomUUID(), name: 'Haushalt 2027' });
  const solo = aWorkspace({ id: randomUUID(), name: 'Notizen' });
  const otherSolo = aWorkspace({ id: randomUUID(), name: 'Entwürfe' });

  function setup() {
    const workspacesRepository = createMockWorkspacesRepository();
    const membersRepository: jest.Mocked<WorkspaceMembersRepository> = {
      create: jest.fn(),
      findWorkspaceIdsByUserId: jest
        .fn()
        .mockResolvedValue([shared.id, solo.id]),
      promoteSuccessors: jest.fn().mockResolvedValue(undefined),
    };
    const workspaceCleanup = jest.fn().mockResolvedValue(undefined);
    const emitted: WorkspaceDeletionRequestedEvent[] = [];
    const eventEmitter = {
      emitAsync: jest.fn(
        (_name: string, event: WorkspaceDeletionRequestedEvent) => {
          emitted.push(event);
          event.deferCleanup('purge workspace storage', workspaceCleanup);
          return Promise.resolve([]);
        },
      ),
    };
    const listener = new WorkspacesUserDeletionRequestedListener(
      membersRepository,
      workspacesRepository,
      new WorkspaceDeletionService(
        workspacesRepository,
        eventEmitter as unknown as EventEmitter2,
      ),
    );
    const event = new UserDeletionRequestedEvent(TEST_USER_ID, TEST_ORG_ID);
    return {
      workspacesRepository,
      membersRepository,
      workspaceCleanup,
      emitted,
      listener,
      event,
    };
  }

  it('changes no workspace before the user row is deleted', async () => {
    const { listener, event, membersRepository, workspacesRepository } =
      setup();

    await listener.handleUserDeletionRequested(event);

    expect(membersRepository.promoteSuccessors).not.toHaveBeenCalled();
    expect(workspacesRepository.delete).not.toHaveBeenCalled();
    expect(event.takeCleanupTasks()).toHaveLength(2);
  });

  it('promotes successors and deletes a workspace left without members through the deletion flow', async () => {
    const {
      listener,
      event,
      membersRepository,
      workspacesRepository,
      workspaceCleanup,
      emitted,
    } = setup();
    workspacesRepository.findMemberless.mockResolvedValue([solo]);

    await listener.handleUserDeletionRequested(event);
    await runDeferredCleanup(event.takeCleanupTasks(), { error: jest.fn() });

    expect(membersRepository.promoteSuccessors).toHaveBeenCalledWith([
      shared.id,
      solo.id,
    ]);
    expect(workspacesRepository.findMemberless).toHaveBeenCalledWith([
      shared.id,
      solo.id,
    ]);
    expect(emitted.map((emittedEvent) => emittedEvent.workspaceId)).toEqual([
      solo.id,
    ]);
    expect(workspacesRepository.delete).toHaveBeenCalledTimes(1);
    expect(workspacesRepository.delete).toHaveBeenCalledWith(solo.id);
    expect(workspaceCleanup).toHaveBeenCalledTimes(1);
  });

  it('keeps deleting other memberless workspaces when one deletion fails', async () => {
    const { listener, event, workspacesRepository, workspaceCleanup } = setup();
    workspacesRepository.findMemberless.mockResolvedValue([solo, otherSolo]);
    workspacesRepository.delete.mockImplementation((id) =>
      id === solo.id
        ? Promise.reject(new Error('lock timeout'))
        : Promise.resolve(),
    );

    await listener.handleUserDeletionRequested(event);
    await runDeferredCleanup(event.takeCleanupTasks(), { error: jest.fn() });

    expect(workspacesRepository.delete).toHaveBeenCalledWith(otherSolo.id);
    expect(workspaceCleanup).toHaveBeenCalledTimes(1);
  });

  it('does not block the user deletion when the memberships cannot be read', async () => {
    const { listener, event, membersRepository } = setup();
    membersRepository.findWorkspaceIdsByUserId.mockRejectedValue(
      new Error('connection reset'),
    );

    await expect(
      listener.handleUserDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toEqual([]);
  });
});
