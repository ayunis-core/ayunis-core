import { SetWorkspaceKnowledgeBaseActivationUseCase } from './set-workspace-knowledge-base-activation.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { SetWorkspaceKnowledgeBaseActivationUseCase as Operation } from 'src/domain/knowledge-bases/application/use-cases/set-workspace-knowledge-base-activation/set-workspace-knowledge-base-activation.use-case';
import { GetWorkspaceKnowledgeBaseUseCase as GetContext } from 'src/domain/workspaces/application/use-cases/get-workspace-knowledge-base/get-workspace-knowledge-base.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    SetWorkspaceKnowledgeBaseActivationUseCase,
  );
  const access = fixture.dependency(WorkspaceAccessService);
  const getContext = fixture.dependency(GetContext);
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue(fixture.knowledgeBase);
  getContext.execute.mockResolvedValue(fixture.knowledgeBaseContext);
  const command = { ...fixture.knowledgeBaseQuery, isActive: false };
  return {
    ...fixture,
    operation,
    command,
    expected: fixture.knowledgeBaseContext,
    access,
    getContext,
  };
}
describe(SetWorkspaceKnowledgeBaseActivationUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, access, getContext } =
      fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.execute).toHaveBeenCalledWith(command);
    expect(getContext.execute).toHaveBeenCalledWith(command);
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
