import { ListWorkspaceKnowledgeBaseDocumentsUseCase } from './list-workspace-knowledge-base-documents.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { ListWorkspaceKnowledgeBaseDocumentsUseCase as Operation } from 'src/domain/knowledge-bases/application/use-cases/list-workspace-knowledge-base-documents/list-workspace-knowledge-base-documents.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    ListWorkspaceKnowledgeBaseDocumentsUseCase,
  );
  const access = fixture.dependency(WorkspaceAccessService);
  const documents = [{ id: fixture.knowledgeBase.id }] as Source[];
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue(documents);
  const command = fixture.knowledgeBaseQuery;
  return {
    ...fixture,
    operation,
    command,
    expected: documents,
    access,
    documents,
  };
}
describe(ListWorkspaceKnowledgeBaseDocumentsUseCase.name, () => {
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
