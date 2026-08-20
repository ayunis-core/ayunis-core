import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  InvalidWorkspaceAppearanceError,
  InvalidWorkspaceDescriptionError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WORKSPACE_DESCRIPTION_MAX_LENGTH } from 'src/domain/workspaces/domain/workspaces.constants';
import {
  aWorkspace,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { UpdateWorkspaceCommand } from './update-workspace.command';
import { UpdateWorkspaceUseCase } from './update-workspace.use-case';

describe('UpdateWorkspaceUseCase', () => {
  let useCase: UpdateWorkspaceUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;
  let accessService: { requireAccessLevel: jest.Mock };

  beforeEach(async () => {
    repository = createMockWorkspacesRepository();
    accessService = {
      requireAccessLevel: jest.fn().mockImplementation(async () => ({
        workspace: await repository.findById(TEST_USER_ID, TEST_WORKSPACE_ID),
      })),
    };
    const module = await Test.createTestingModule({
      providers: [
        UpdateWorkspaceUseCase,
        {
          provide: getLoggerToken(UpdateWorkspaceUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: WorkspacesRepository, useValue: repository },
        { provide: WorkspaceAccessService, useValue: accessService },
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
        id: TEST_WORKSPACE_ID,
        name: 'Neu',
        color: '#112233',
      }),
    );

    expect(updated.name).toBe('Neu');
    expect(updated.color).toBe('#112233');
    expect(updated.description).toBe('Beschreibung');
    expect(updated.icon).toBe('folder');
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.EDIT,
    );
  });

  it('clears the description when null is sent', async () => {
    repository.findById.mockResolvedValue(
      aWorkspace({ description: 'Beschreibung' }),
    );

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({
        id: TEST_WORKSPACE_ID,
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
          id: TEST_WORKSPACE_ID,
          description: 'a'.repeat(WORKSPACE_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ),
    ).rejects.toThrow(InvalidWorkspaceDescriptionError);
  });

  it('rejects an icon that is not a catalogue key', async () => {
    repository.findById.mockResolvedValue(aWorkspace());

    await expect(
      useCase.execute(
        new UpdateWorkspaceCommand({ id: TEST_WORKSPACE_ID, icon: 'Flame!' }),
      ),
    ).rejects.toThrow(InvalidWorkspaceAppearanceError);
  });

  it('rejects a colour that is neither palette key nor hex', async () => {
    repository.findById.mockResolvedValue(aWorkspace());

    await expect(
      useCase.execute(
        new UpdateWorkspaceCommand({ id: TEST_WORKSPACE_ID, color: 'Rot 5' }),
      ),
    ).rejects.toThrow(InvalidWorkspaceAppearanceError);
  });

  it('bumps updatedAt so the edit moves in the "last updated" sort', async () => {
    const before = new Date('2026-08-02T10:00:00.000Z');
    repository.findById.mockResolvedValue(aWorkspace({ updatedAt: before }));

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({
        id: TEST_WORKSPACE_ID,
        name: 'Neu',
      }),
    );

    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it('leaves updatedAt alone when nothing was actually sent', async () => {
    const before = new Date('2026-08-02T10:00:00.000Z');
    repository.findById.mockResolvedValue(aWorkspace({ updatedAt: before }));

    const updated = await useCase.execute(
      new UpdateWorkspaceCommand({ id: TEST_WORKSPACE_ID }),
    );

    expect(updated.updatedAt).toEqual(before);
  });

  it('throws when the workspace is unavailable to the caller', async () => {
    accessService.requireAccessLevel.mockRejectedValue(
      new WorkspaceNotFoundError(TEST_WORKSPACE_ID),
    );

    await expect(
      useCase.execute(
        new UpdateWorkspaceCommand({
          id: TEST_WORKSPACE_ID,
          name: 'Neu',
        }),
      ),
    ).rejects.toThrow(WorkspaceNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
