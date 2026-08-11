import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { InvalidWorkspaceDescriptionError } from 'src/domain/workspaces/domain/workspace.errors';
import { WORKSPACE_DESCRIPTION_MAX_LENGTH } from 'src/domain/workspaces/domain/workspaces.constants';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { UpdateWorkspaceCommand } from './update-workspace.command';
import { UpdateWorkspaceUseCase } from './update-workspace.use-case';

describe('UpdateWorkspaceUseCase', () => {
  let useCase: UpdateWorkspaceUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(async () => {
    repository = createMockWorkspacesRepository();
    const module = await Test.createTestingModule({
      providers: [
        UpdateWorkspaceUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(UpdateWorkspaceUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies only the fields that were sent', async () => {
    repository.findById.mockResolvedValue(
      aWorkspace({ name: 'Alt', description: 'Beschreibung', icon: 'folder' }),
    );

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({
        workspaceId: TEST_WORKSPACE_ID,
        name: 'Neu',
        color: '#112233',
      }),
    );

    expect(updated.name).toBe('Neu');
    expect(updated.color).toBe('#112233');
    expect(updated.description).toBe('Beschreibung');
    expect(updated.icon).toBe('folder');
  });

  it('clears the description when null is sent', async () => {
    repository.findById.mockResolvedValue(
      aWorkspace({ description: 'Beschreibung' }),
    );

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({
        workspaceId: TEST_WORKSPACE_ID,
        description: null,
      }),
    );

    expect(updated.description).toBeNull();
  });

  it('rejects a description longer than the maximum length', async () => {
    repository.findById.mockResolvedValue(aWorkspace());

    await expect(
      useCase.execute(
        new UpdateWorkspaceCommand({
          workspaceId: TEST_WORKSPACE_ID,
          description: 'a'.repeat(WORKSPACE_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ),
    ).rejects.toThrow(InvalidWorkspaceDescriptionError);
  });

  it('bumps updatedAt so the edit moves in the "last updated" sort', async () => {
    const before = new Date('2026-08-02T10:00:00.000Z');
    repository.findById.mockResolvedValue(aWorkspace({ updatedAt: before }));

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({
        workspaceId: TEST_WORKSPACE_ID,
        name: 'Neu',
      }),
    );

    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it('leaves updatedAt alone when nothing was actually sent', async () => {
    const before = new Date('2026-08-02T10:00:00.000Z');
    repository.findById.mockResolvedValue(aWorkspace({ updatedAt: before }));

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({ workspaceId: TEST_WORKSPACE_ID }),
    );

    expect(updated.updatedAt).toEqual(before);
  });

  it('does not touch the pin state or the manual order', async () => {
    repository.findById.mockResolvedValue(
      aWorkspace({ isPinned: true, sortOrder: 3 }),
    );

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({
        workspaceId: TEST_WORKSPACE_ID,
        name: 'Neu',
      }),
    );

    expect(updated.isPinned).toBe(true);
    expect(updated.sortOrder).toBe(3);
    // A plain edit must never write the per-user settings row: the mapper
    // defaults a missing/never-ordered row, and persisting those defaults
    // would silently rewrite the caller's manual order.
    expect(repository.saveSettings).not.toHaveBeenCalled();
  });

  it('throws when the workspace does not belong to the caller', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateWorkspaceCommand({
          workspaceId: TEST_WORKSPACE_ID,
          name: 'Neu',
        }),
      ),
    ).rejects.toThrow(WorkspaceNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
