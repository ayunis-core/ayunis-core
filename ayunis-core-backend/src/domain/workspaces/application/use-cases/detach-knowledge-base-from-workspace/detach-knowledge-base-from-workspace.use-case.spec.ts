import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { DetachKnowledgeBaseFromWorkspaceCommand } from './detach-knowledge-base-from-workspace.command';
import { DetachKnowledgeBaseFromWorkspaceUseCase } from './detach-knowledge-base-from-workspace.use-case';

describe('DetachKnowledgeBaseFromWorkspaceUseCase', () => {
  it('detaches a knowledge base with edit access', async () => {
    const knowledgeBaseId = randomUUID();
    const repository = {
      detachKnowledgeBase: jest.fn().mockResolvedValue(undefined),
    };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
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
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.EDIT,
    );
    expect(repository.detachKnowledgeBase).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      knowledgeBaseId,
    );
  });
});
