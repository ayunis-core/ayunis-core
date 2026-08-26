import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  TEST_WORKSPACE_ID,
  aWorkspace,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { UpdateWorkspaceVisibilityCommand } from './update-workspace-visibility.command';
import { UpdateWorkspaceVisibilityUseCase } from './update-workspace-visibility.use-case';

describe('UpdateWorkspaceVisibilityUseCase', () => {
  it('changes visibility with full access', async () => {
    const workspace = aWorkspace();
    const repository = createMockWorkspacesRepository();
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({ workspace }),
    };
    const useCase = new UpdateWorkspaceVisibilityUseCase(
      createPinoLoggerMock(),
      repository,
      accessService as never,
    );

    const result = await useCase.execute(
      new UpdateWorkspaceVisibilityCommand(
        TEST_WORKSPACE_ID,
        WorkspaceVisibility.ORGANIZATION,
      ),
    );

    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
    expect(result.visibility).toBe(WorkspaceVisibility.ORGANIZATION);
    expect(repository.save).toHaveBeenCalledWith(workspace);
  });
});
