import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { AttachKnowledgeBaseToWorkspaceCommand } from './attach-knowledge-base-to-workspace.command';
import { AttachKnowledgeBaseToWorkspaceUseCase } from './attach-knowledge-base-to-workspace.use-case';

describe('AttachKnowledgeBaseToWorkspaceUseCase', () => {
  it('attaches an accessible knowledge base with edit access', async () => {
    const knowledgeBaseId = randomUUID();
    const repository = {
      attachKnowledgeBase: jest.fn().mockResolvedValue(undefined),
    };
    const knowledgeBaseAccessService = {
      findAccessibleKnowledgeBase: jest.fn().mockResolvedValue({
        id: knowledgeBaseId,
      }),
    };
    const accessService = { requireRole: jest.fn().mockResolvedValue({}) };
    const useCase = new AttachKnowledgeBaseToWorkspaceUseCase(
      createPinoLoggerMock(),
      repository as never,
      knowledgeBaseAccessService as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new AttachKnowledgeBaseToWorkspaceCommand(
          TEST_WORKSPACE_ID,
          knowledgeBaseId,
        ),
      ),
    ).resolves.toBeUndefined();
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.EDIT,
    );
    expect(repository.attachKnowledgeBase).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      knowledgeBaseId,
    );
  });
});
