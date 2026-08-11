import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { ToggleWorkspacePinnedCommand } from './toggle-workspace-pinned.command';
import { ToggleWorkspacePinnedUseCase } from './toggle-workspace-pinned.use-case';

describe('ToggleWorkspacePinnedUseCase', () => {
  let useCase: ToggleWorkspacePinnedUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(async () => {
    repository = createMockWorkspacesRepository();
    const module = await Test.createTestingModule({
      providers: [
        ToggleWorkspacePinnedUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(ToggleWorkspacePinnedUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the workspace carrying the new pin state', async () => {
    repository.findById.mockResolvedValue(aWorkspace({ isPinned: true }));
    repository.togglePinned.mockResolvedValue(false);

    const workspace = await useCase.execute(
      new ToggleWorkspacePinnedCommand({ workspaceId: TEST_WORKSPACE_ID }),
    );

    expect(workspace.isPinned).toBe(false);
    expect(repository.togglePinned).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_WORKSPACE_ID,
    );
  });

  it('does not re-save the workspace, so updatedAt is left alone', async () => {
    repository.findById.mockResolvedValue(aWorkspace());

    await useCase.execute(
      new ToggleWorkspacePinnedCommand({ workspaceId: TEST_WORKSPACE_ID }),
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws when the workspace does not belong to the caller', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new ToggleWorkspacePinnedCommand({ workspaceId: TEST_WORKSPACE_ID }),
      ),
    ).rejects.toThrow(WorkspaceNotFoundError);
    expect(repository.togglePinned).not.toHaveBeenCalled();
  });
});
