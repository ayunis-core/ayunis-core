import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  createMockWorkspaceAccessService,
  createMockWorkspacesRepository,
  TEST_WORKSPACE_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { UpdateWorkspaceInstructionCommand } from './update-workspace-instruction.command';
import { UpdateWorkspaceInstructionUseCase } from './update-workspace-instruction.use-case';

describe('UpdateWorkspaceInstructionUseCase', () => {
  it('stores trimmed project instructions', async () => {
    const repository = createMockWorkspacesRepository();
    const access = createMockWorkspaceAccessService(aWorkspace(), 'edit');
    const useCase = new UpdateWorkspaceInstructionUseCase(
      repository,
      access as unknown as WorkspaceAccessService,
    );

    const result = await useCase.execute(
      new UpdateWorkspaceInstructionCommand(
        TEST_WORKSPACE_ID,
        '  Use building department wording.  ',
      ),
    );

    expect(result.instruction).toBe('Use building department wording.');
    expect(access.require).toHaveBeenCalledWith(TEST_WORKSPACE_ID, 'edit');
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        instruction: 'Use building department wording.',
      }),
    );
  });

  it('clears blank project instructions', async () => {
    const repository = createMockWorkspacesRepository();
    const access = createMockWorkspaceAccessService(
      aWorkspace({ instruction: 'Use building department wording.' }),
      'edit',
    );
    const useCase = new UpdateWorkspaceInstructionUseCase(
      repository,
      access as unknown as WorkspaceAccessService,
    );

    const result = await useCase.execute(
      new UpdateWorkspaceInstructionCommand(TEST_WORKSPACE_ID, '   '),
    );

    expect(result.instruction).toBeNull();
  });
});
