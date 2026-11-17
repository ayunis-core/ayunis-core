jest.mock('@nestjs-cls/transactional', () => ({
  ...jest.requireActual<object>('@nestjs-cls/transactional'),
  Transactional: () => () => undefined,
}));

import type { UUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceMemberRemovedEvent } from 'src/domain/workspaces/application/events/workspace-member-removed.event';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  createMockContextService,
  createMockWorkspaceMembersRepository,
  createRoleMatrix,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import {
  WorkspaceLastAdminError,
  WorkspaceMemberNotFoundError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { WorkspaceMemberRemovalService } from './workspace-member-removal.service';

const CALLER_ID = TEST_USER_ID;
const BEN_ID = '44444444-4444-4444-8444-444444444444' as UUID;

describe('WorkspaceMemberRemovalService', () => {
  function setup(members: Partial<Record<UUID, UserRole>>, adminCount = 1) {
    const repository = createMockWorkspaceMembersRepository();
    repository.findRole.mockImplementation((_workspaceId, userId) =>
      Promise.resolve(members[userId] ?? null),
    );
    repository.findOne.mockImplementation((workspaceId, userId) => {
      const role = members[userId];
      return Promise.resolve(
        role ? new WorkspaceMember({ workspaceId, userId, role }) : null,
      );
    });
    repository.countAdmins.mockResolvedValue(adminCount);
    const context = createMockContextService();
    const eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;
    const service = new WorkspaceMemberRemovalService(
      repository,
      new WorkspaceAccessService(
        repository,
        createRoleMatrix().getMyPermissions,
        context,
      ),
      eventEmitter,
      context,
    );
    return { service, repository, eventEmitter };
  }

  it('lets a manager remove a user and announces the removal', async () => {
    const { service, repository, eventEmitter } = setup({
      [CALLER_ID]: UserRole.MANAGER,
      [BEN_ID]: UserRole.USER,
    });

    await service.remove(TEST_WORKSPACE_ID, BEN_ID);

    expect(repository.delete).toHaveBeenCalledWith(TEST_WORKSPACE_ID, BEN_ID);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      WorkspaceMemberRemovedEvent.EVENT_NAME,
      new WorkspaceMemberRemovedEvent(TEST_WORKSPACE_ID, BEN_ID, TEST_ORG_ID),
    );
  });

  it('keeps an admin a manager tries to remove', async () => {
    const { service, repository, eventEmitter } = setup(
      { [CALLER_ID]: UserRole.MANAGER, [BEN_ID]: UserRole.ADMIN },
      2,
    );

    await expect(service.remove(TEST_WORKSPACE_ID, BEN_ID)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('lets an admin remove another admin', async () => {
    const { service, repository } = setup(
      { [CALLER_ID]: UserRole.ADMIN, [BEN_ID]: UserRole.ADMIN },
      2,
    );

    await service.remove(TEST_WORKSPACE_ID, BEN_ID);

    expect(repository.delete).toHaveBeenCalledWith(TEST_WORKSPACE_ID, BEN_ID);
  });

  it('keeps a member a user tries to remove', async () => {
    const { service, repository } = setup({
      [CALLER_ID]: UserRole.USER,
      [BEN_ID]: UserRole.USER,
    });

    await expect(service.remove(TEST_WORKSPACE_ID, BEN_ID)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('tells a non-member only that the workspace does not exist', async () => {
    const { service, repository } = setup({ [BEN_ID]: UserRole.USER });

    await expect(service.remove(TEST_WORKSPACE_ID, BEN_ID)).rejects.toThrow(
      WorkspaceNotFoundError,
    );
    await expect(service.remove(TEST_WORKSPACE_ID, CALLER_ID)).rejects.toThrow(
      WorkspaceNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('reports a user who is not a member to a member who may remove', async () => {
    const { service } = setup({ [CALLER_ID]: UserRole.ADMIN });

    await expect(service.remove(TEST_WORKSPACE_ID, BEN_ID)).rejects.toThrow(
      WorkspaceMemberNotFoundError,
    );
  });

  it('lets a user leave without any permission', async () => {
    const { service, repository } = setup({ [CALLER_ID]: UserRole.USER });

    await service.remove(TEST_WORKSPACE_ID, CALLER_ID);

    expect(repository.delete).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      CALLER_ID,
    );
  });

  it('keeps the last admin, whether they leave or are removed', async () => {
    const { service, repository, eventEmitter } = setup({
      [CALLER_ID]: UserRole.ADMIN,
    });

    await expect(service.remove(TEST_WORKSPACE_ID, CALLER_ID)).rejects.toThrow(
      WorkspaceLastAdminError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('lets one of two admins leave', async () => {
    const { service, repository } = setup(
      { [CALLER_ID]: UserRole.ADMIN, [BEN_ID]: UserRole.ADMIN },
      2,
    );

    await service.remove(TEST_WORKSPACE_ID, CALLER_ID);

    expect(repository.delete).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      CALLER_ID,
    );
  });
});
