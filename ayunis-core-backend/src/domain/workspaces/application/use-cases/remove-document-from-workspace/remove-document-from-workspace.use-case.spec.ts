import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import {
  TEST_ORG_ID,
  TEST_WORKSPACE_ID,
  aWorkspace,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { RemoveDocumentFromWorkspaceCommand } from './remove-document-from-workspace.command';
import { RemoveDocumentFromWorkspaceUseCase } from './remove-document-from-workspace.use-case';

describe('RemoveDocumentFromWorkspaceUseCase', () => {
  it('deletes an attached document with edit access', async () => {
    const sourceId = randomUUID();
    const repository = createMockWorkspacesRepository();
    repository.getContextRefs.mockResolvedValue({
      skillIds: [],
      knowledgeBases: [],
      sourceIds: [sourceId],
    });
    const deleteSource = { execute: jest.fn().mockResolvedValue(undefined) };
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
    };
    const useCase = new RemoveDocumentFromWorkspaceUseCase(
      createPinoLoggerMock(),
      repository,
      deleteSource as never,
      accessService as never,
    );

    await useCase.execute(
      new RemoveDocumentFromWorkspaceCommand(TEST_WORKSPACE_ID, sourceId),
    );

    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.EDIT,
    );
    expect(deleteSource.execute).toHaveBeenCalledWith(
      new DeleteSourceCommand(sourceId, TEST_ORG_ID),
    );
  });
});
