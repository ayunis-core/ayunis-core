jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (
      _target: object,
      _propertyName: string | symbol,
      descriptor: PropertyDescriptor,
    ) =>
      descriptor,
}));

import type { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import type { WorkspaceDirectoryService } from 'src/domain/workspaces/application/services/workspace-directory.service';
import { WorkspaceOwnershipService } from 'src/domain/workspaces/application/services/workspace-ownership.service';
import {
  aWorkspace,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { WorkspacesUserDeletionRequestedListener } from './user-deletion-requested.listener';

const lena = randomUUID();
const sabine = randomUUID();

const directory = new OrgDirectory(
  [
    { id: TEST_USER_ID, name: 'Tobias', teams: [] },
    { id: lena, name: 'Lena', teams: [] },
    { id: sabine, name: 'Sabine', teams: [] },
  ],
  [],
);

function setup() {
  const shared = aWorkspace({ id: randomUUID() });
  const solo = aWorkspace({ id: randomUUID() });
  const sharedSharing = new WorkspaceSharing({
    workspaceId: shared.id,
    ownerId: TEST_USER_ID,
  });
  sharedSharing.invite(
    { userIds: [lena], teamIds: [], level: 'use', at: new Date() },
    directory,
  );
  sharedSharing.invite(
    { userIds: [sabine], teamIds: [], level: 'full', at: new Date() },
    directory,
  );
  const soloSharing = new WorkspaceSharing({
    workspaceId: solo.id,
    ownerId: TEST_USER_ID,
  });
  const repository = createMockWorkspacesRepository();
  repository.findAllOwnedBy.mockResolvedValue([shared, solo]);
  repository.findOne.mockImplementation((id) =>
    Promise.resolve(
      [shared, solo].find((workspace) => workspace.id === id) ?? null,
    ),
  );
  const sharingRepository = {
    loadMany: jest.fn().mockResolvedValue(
      new Map([
        [shared.id, sharedSharing],
        [solo.id, soloSharing],
      ]),
    ),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const purge = jest.fn().mockResolvedValue(undefined);
  const eventEmitter = {
    emitAsync: jest
      .fn()
      .mockImplementation(
        (_name: string, deletion: WorkspaceDeletionRequestedEvent) => {
          deletion.deferCleanup('purge thread storage', purge);
          return Promise.resolve([]);
        },
      ),
  };
  const directoryService = {
    loadForOrg: jest.fn().mockResolvedValue(directory),
  };
  const listener = new WorkspacesUserDeletionRequestedListener(
    repository,
    directoryService as unknown as WorkspaceDirectoryService,
    new WorkspaceOwnershipService(sharingRepository, repository),
    new WorkspaceDeletionService(
      repository,
      eventEmitter as unknown as EventEmitter2,
    ),
  );
  return {
    listener,
    purge,
    repository,
    shared,
    solo,
    sharedSharing,
    sharingRepository,
    eventEmitter,
    directoryService,
  };
}

describe(WorkspacesUserDeletionRequestedListener.name, () => {
  it('hands shared workspaces to the member with the highest level', async () => {
    const { listener, sharedSharing, sharingRepository } = setup();

    await listener.handle(
      new UserDeletionRequestedEvent(TEST_USER_ID, TEST_ORG_ID),
    );

    expect(sharedSharing.ownerId).toBe(sabine);
    expect(sharedSharing.levelOf(lena, [])).toBe('use');
    expect(sharingRepository.save).toHaveBeenCalledWith(sharedSharing);
  });

  it('runs the normal workspace cleanup for workspaces nobody else uses, after the user is gone', async () => {
    const { listener, solo, eventEmitter } = setup();
    const event = new UserDeletionRequestedEvent(TEST_USER_ID, TEST_ORG_ID);

    await listener.handle(event);

    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      expect.objectContaining({ workspaceId: solo.id }),
    );
    expect(event.takeCleanupTasks().map(({ label }) => label)).toEqual([
      'purge thread storage',
    ]);
  });

  it('reads the directory of the deleted person’s organisation', async () => {
    const { listener, directoryService } = setup();
    const orgId = randomUUID();

    await listener.handle(new UserDeletionRequestedEvent(TEST_USER_ID, orgId));

    expect(directoryService.loadForOrg).toHaveBeenCalledWith(orgId);
  });

  it('lets a failed hand-over stop the user deletion', async () => {
    const { listener, sharingRepository } = setup();
    sharingRepository.save.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handle(
        new UserDeletionRequestedEvent(TEST_USER_ID, TEST_ORG_ID),
      ),
    ).rejects.toThrow('db down');
  });

  it('leaves a workspace alone that someone handed over in the meantime', async () => {
    const {
      listener,
      repository,
      shared,
      solo,
      sharingRepository,
      eventEmitter,
    } = setup();
    const newOwner = aWorkspace({ id: shared.id, userId: lena });
    repository.findOne.mockImplementation((id) =>
      Promise.resolve(id === shared.id ? newOwner : solo),
    );

    await listener.handle(
      new UserDeletionRequestedEvent(TEST_USER_ID, TEST_ORG_ID),
    );

    expect(repository.lockForUpdate).toHaveBeenCalledWith(shared.id);
    expect(sharingRepository.save).not.toHaveBeenCalled();
    expect(repository.changeOwner).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      expect.objectContaining({ workspaceId: solo.id }),
    );
  });

  it('runs the deferred workspace cleanup only once the workspace is gone', async () => {
    const { listener, repository, solo, purge } = setup();
    const event = new UserDeletionRequestedEvent(TEST_USER_ID, TEST_ORG_ID);
    await listener.handle(event);
    const [cleanup] = event.takeCleanupTasks();

    repository.findOne.mockResolvedValue(solo);
    await cleanup.run();
    expect(purge).not.toHaveBeenCalled();

    repository.findOne.mockResolvedValue(null);
    await cleanup.run();
    expect(purge).toHaveBeenCalledTimes(1);
  });
});
