import { GetWorkspaceSkillUseCase } from './get-workspace-skill.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { FindWorkspaceSkillUseCase as Operation } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    GetWorkspaceSkillUseCase,
  );
  const access = fixture.dependency(AssertWorkspaceReadAccessUseCase);
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue(fixture.skillContext);
  const command = fixture.skillQuery;
  return {
    ...fixture,
    operation,
    command,
    expected: fixture.skillContext,
    access,
  };
}
describe(GetWorkspaceSkillUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, access } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.execute).toHaveBeenCalledWith(command);
    expect(access.execute).toHaveBeenCalledWith({
      workspaceId: command.workspaceId,
    });
  });
  it('does not execute the operation when workspace authorization fails', async () => {
    const { useCase, operation, command, access } = await setup();
    const error = new WorkspaceNotFoundError(command.workspaceId);
    access.execute.mockRejectedValue(error);
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
