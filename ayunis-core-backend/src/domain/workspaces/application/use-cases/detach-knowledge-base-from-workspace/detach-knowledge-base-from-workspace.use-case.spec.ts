import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { DetachKnowledgeBaseFromWorkspaceCommand } from './detach-knowledge-base-from-workspace.command';
import { DetachKnowledgeBaseFromWorkspaceUseCase } from './detach-knowledge-base-from-workspace.use-case';

describe('DetachKnowledgeBaseFromWorkspaceUseCase', () => {
  it('detaches a knowledge base with edit access', async () => {
    const knowledgeBaseId = randomUUID();
    const repository = {
      detachKnowledgeBase: jest.fn().mockResolvedValue(undefined),
    };
    const accessService = { requireRole: jest.fn().mockResolvedValue({}) };
    const useCase = new DetachKnowledgeBaseFromWorkspaceUseCase(
      createPinoLoggerMock(),
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new DetachKnowledgeBaseFromWorkspaceCommand(
          TEST_WORKSPACE_ID,
          knowledgeBaseId,
        ),
      ),
    ).resolves.toBeUndefined();
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.EDIT,
    );
    expect(repository.detachKnowledgeBase).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      knowledgeBaseId,
    );
  });
});
