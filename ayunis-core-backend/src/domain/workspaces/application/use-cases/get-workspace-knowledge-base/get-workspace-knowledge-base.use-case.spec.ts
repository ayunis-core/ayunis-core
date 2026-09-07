import { GetWorkspaceKnowledgeBaseUseCase } from './get-workspace-knowledge-base.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { FindWorkspaceKnowledgeBaseUseCase as Operation } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base/find-workspace-knowledge-base.use-case';
import { CountKnowledgeBaseDocumentsUseCase as CountDocuments } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    GetWorkspaceKnowledgeBaseUseCase,
  );
  const access = fixture.dependency(WorkspaceAccessService);
  const count = fixture.dependency(CountDocuments);
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue({
    knowledgeBase: fixture.knowledgeBase,
    isActive: true,
  });
  count.execute.mockResolvedValue(new Map([[fixture.knowledgeBase.id, 2]]));
  const command = fixture.knowledgeBaseQuery;
  return {
    ...fixture,
    operation,
    command,
    expected: fixture.knowledgeBaseContext,
    access,
    count,
  };
}
describe(GetWorkspaceKnowledgeBaseUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, access, count } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.execute).toHaveBeenCalledWith(command);
    expect(count.execute).toHaveBeenCalledWith({
      knowledgeBaseIds: [command.knowledgeBaseId],
    });
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
  it('defaults absent counts to zero', async () => {
    const { useCase, command, count } = await setup();
    count.execute.mockResolvedValue(new Map());
    await expect(useCase.execute(command)).resolves.toMatchObject({
      documentCount: 0,
    });
  });
});
