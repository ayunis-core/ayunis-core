import { RemoveWorkspaceKnowledgeBaseDocumentUseCase } from './remove-workspace-knowledge-base-document.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { RemoveWorkspaceKnowledgeBaseDocumentUseCase as Operation } from 'src/domain/knowledge-bases/application/use-cases/remove-workspace-knowledge-base-document/remove-workspace-knowledge-base-document.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    RemoveWorkspaceKnowledgeBaseDocumentUseCase,
  );
  const access = fixture.dependency(WorkspaceAccessService);
  const operation = fixture.dependency(Operation);

  const command = {
    ...fixture.knowledgeBaseQuery,
    documentId: fixture.knowledgeBase.id,
  };
  return { ...fixture, operation, command, expected: undefined, access };
}
describe(RemoveWorkspaceKnowledgeBaseDocumentUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, access } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.execute).toHaveBeenCalledWith(command);
    expect(access.requireOwned).toHaveBeenCalledWith(command.workspaceId);
  });
  it('does not execute the operation when workspace authorization fails', async () => {
    const { useCase, operation, command, access } = await setup();
    const error = new WorkspaceNotFoundError(command.workspaceId);
    access.requireOwned.mockRejectedValue(error);
    await expect(useCase.execute(command)).rejects.toBe(error);
    expect(operation.execute).not.toHaveBeenCalled();
  });
  it('wraps unexpected operation failures', async () => {
    const { useCase, operation, command } = await setup();
    operation.execute.mockRejectedValue(new Error('Operation failed'));
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedWorkspaceError,
    );
  });
});
