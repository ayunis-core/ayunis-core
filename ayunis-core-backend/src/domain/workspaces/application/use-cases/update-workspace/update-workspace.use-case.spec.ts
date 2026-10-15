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

import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import type { WorkspaceSummaryService } from 'src/domain/workspaces/application/services/workspace-summary.service';
import {
  InvalidWorkspaceAppearanceError,
  InvalidWorkspaceDescriptionError,
  WorkspaceInsufficientAccessError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WORKSPACE_DESCRIPTION_MAX_LENGTH } from 'src/domain/workspaces/domain/workspaces.constants';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import {
  aWorkspace,
  createMockWorkspaceAccessService,
  createMockWorkspacesRepository,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { UpdateWorkspaceCommand } from './update-workspace.command';
import { UpdateWorkspaceUseCase } from './update-workspace.use-case';

function setup(
  workspace: Workspace = aWorkspace(),
  level: WorkspaceAccessLevel = 'owner',
) {
  const repository: jest.Mocked<WorkspacesRepository> =
    createMockWorkspacesRepository();
  const access = createMockWorkspaceAccessService(workspace, level);
  const summaries = {
    detail: jest
      .fn()
      .mockImplementation(({ workspace: saved, level: own }) =>
        Promise.resolve({ workspace: saved, accessLevel: own, memberCount: 2 }),
      ),
  };
  const useCase = new UpdateWorkspaceUseCase(
    repository,
    access as unknown as WorkspaceAccessService,
    summaries as unknown as WorkspaceSummaryService,
  );
  return { useCase, repository, access };
}

async function update(
  useCase: UpdateWorkspaceUseCase,
  fields: Omit<ConstructorParameters<typeof UpdateWorkspaceCommand>[0], 'id'>,
): Promise<Workspace> {
  const detail = await useCase.execute(
    new UpdateWorkspaceCommand({ id: TEST_WORKSPACE_ID, ...fields }),
  );
  return detail.workspace;
}

describe('UpdateWorkspaceUseCase', () => {
  it('applies only the fields that were sent', async () => {
    const { useCase } = setup(
      aWorkspace({ name: 'Alt', description: 'Beschreibung', icon: 'folder' }),
    );

    const updated = await update(useCase, { name: 'Neu', color: '#112233' });

    expect(updated.name).toBe('Neu');
    expect(updated.color).toBe('#112233');
    expect(updated.description).toBe('Beschreibung');
    expect(updated.icon).toBe('folder');
  });

  it('locks the workspace before reading it', async () => {
    const { useCase, repository, access } = setup();
    const order: string[] = [];
    repository.lockForUpdate.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve();
    });
    access.require.mockImplementation(() => {
      order.push('read');
      return Promise.resolve({ workspace: aWorkspace(), level: 'owner' });
    });

    await update(useCase, { name: 'Neu' });

    expect(order).toEqual(['lock', 'read']);
  });

  it('needs full access and answers with the caller’s level', async () => {
    const { useCase, access } = setup(aWorkspace(), 'full');

    const detail = await useCase.execute(
      new UpdateWorkspaceCommand({ id: TEST_WORKSPACE_ID, name: 'Neu' }),
    );

    expect(access.require).toHaveBeenCalledWith(TEST_WORKSPACE_ID, 'full');
    expect(detail.accessLevel).toBe('full');
    expect(detail.memberCount).toBe(2);
  });

  it('changes nothing for members who may only edit content', async () => {
    const { useCase, access, repository } = setup();
    access.require.mockRejectedValue(
      new WorkspaceInsufficientAccessError(TEST_WORKSPACE_ID),
    );

    await expect(update(useCase, { name: 'Neu' })).rejects.toBeInstanceOf(
      WorkspaceInsufficientAccessError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('keeps the not-found answer for people without access', async () => {
    const { useCase, access, repository } = setup();
    access.require.mockRejectedValue(
      new WorkspaceNotFoundError(TEST_WORKSPACE_ID),
    );

    await expect(update(useCase, { name: 'Neu' })).rejects.toBeInstanceOf(
      WorkspaceNotFoundError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('clears the description when null is sent', async () => {
    const { useCase } = setup(aWorkspace({ description: 'Beschreibung' }));

    const updated = await update(useCase, { description: null });

    expect(updated.description).toBeNull();
  });

  it('rejects a description longer than the maximum length', async () => {
    const { useCase } = setup();

    await expect(
      update(useCase, {
        description: 'a'.repeat(WORKSPACE_DESCRIPTION_MAX_LENGTH + 1),
      }),
    ).rejects.toThrow(InvalidWorkspaceDescriptionError);
  });

  it('rejects an icon that is not a catalogue key', async () => {
    const { useCase } = setup();

    await expect(update(useCase, { icon: 'Flame!' })).rejects.toThrow(
      InvalidWorkspaceAppearanceError,
    );
  });

  it('rejects a colour that is neither palette key nor hex', async () => {
    const { useCase } = setup();

    await expect(update(useCase, { color: 'Rot 5' })).rejects.toThrow(
      InvalidWorkspaceAppearanceError,
    );
  });

  it('bumps updatedAt so the edit moves in the "last updated" sort', async () => {
    const before = new Date('2026-08-02T10:00:00.000Z');
    const { useCase } = setup(aWorkspace({ updatedAt: before }));

    const updated = await update(useCase, { name: 'Neu' });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it('leaves updatedAt alone when nothing was actually sent', async () => {
    const before = new Date('2026-08-02T10:00:00.000Z');
    const { useCase } = setup(aWorkspace({ updatedAt: before }));

    const updated = await update(useCase, {});

    expect(updated.updatedAt).toEqual(before);
  });
});
