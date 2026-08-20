import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  TEST_WORKSPACE_ID,
  aWorkspace,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UpdateWorkspaceInstructionCommand } from './update-workspace-instruction.command';
import { UpdateWorkspaceInstructionUseCase } from './update-workspace-instruction.use-case';

describe('UpdateWorkspaceInstructionUseCase', () => {
  it('stores trimmed project instructions with edit access', async () => {
    const repository = createMockWorkspacesRepository();
    const workspace = aWorkspace();
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace }),
    };
    const useCase = new UpdateWorkspaceInstructionUseCase(
      createPinoLoggerMock(),
      repository,
      accessService as never,
    );

    const result = await useCase.execute(
      new UpdateWorkspaceInstructionCommand(
        TEST_WORKSPACE_ID,
        '  Use building department wording.  ',
      ),
    );

    expect(result.instruction).toBe('Use building department wording.');
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.EDIT,
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        instruction: 'Use building department wording.',
      }),
    );
  });

  it('clears blank project instructions', async () => {
    const repository = createMockWorkspacesRepository();
    const workspace = aWorkspace({
      instruction: 'Use building department wording.',
    });
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace }),
    };
    const useCase = new UpdateWorkspaceInstructionUseCase(
      createPinoLoggerMock(),
      repository,
      accessService as never,
    );

    const result = await useCase.execute(
      new UpdateWorkspaceInstructionCommand(TEST_WORKSPACE_ID, '   '),
    );

    expect(result.instruction).toBeNull();
  });
});
