import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  TEST_WORKSPACE_ID,
  aWorkspace,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { AddDocumentToWorkspaceCommand } from './add-document-to-workspace.command';
import { AddDocumentToWorkspaceUseCase } from './add-document-to-workspace.use-case';

describe('AddDocumentToWorkspaceUseCase', () => {
  it('uploads and attaches a document with edit access', async () => {
    const sourceId = randomUUID();
    const source = { id: sourceId };
    const repository = createMockWorkspacesRepository();
    const processor = { execute: jest.fn().mockResolvedValue(source) };
    const deleteSource = { execute: jest.fn() };
    const accessService = {
      requireAccessLevel: jest
        .fn()
        .mockResolvedValue({ workspace: aWorkspace() }),
    };
    const useCase = new AddDocumentToWorkspaceUseCase(
      createPinoLoggerMock(),
      repository,
      processor as never,
      deleteSource as never,
      accessService as never,
    );

    const result = await useCase.execute(
      new AddDocumentToWorkspaceCommand(
        TEST_WORKSPACE_ID,
        Buffer.from('document'),
        'policy.pdf',
        'application/pdf',
      ),
    );

    expect(result).toBe(source);
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.EDIT,
    );
    expect(repository.attachSource).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      sourceId,
    );
  });
});
