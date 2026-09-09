import { UpdateWorkspaceSkillUseCase } from './update-workspace-skill.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UpdateWorkspaceSkillUseCase as Operation } from 'src/domain/skills/application/use-cases/update-workspace-skill/update-workspace-skill.use-case';
import { FindWorkspaceSkillUseCase as FindSkill } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    UpdateWorkspaceSkillUseCase,
  );
  const access = fixture.dependency(WorkspaceAccessService);
  const find = fixture.dependency(FindSkill);
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue(fixture.skill);
  find.execute.mockResolvedValue(fixture.skillContext);
  const command = { ...fixture.skillQuery, values: fixture.skill };
  return {
    ...fixture,
    operation,
    command,
    expected: fixture.skillContext,
    access,
    find,
  };
}
describe(UpdateWorkspaceSkillUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, access, find } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.execute).toHaveBeenCalledWith(command);
    expect(find.execute).toHaveBeenCalledWith(command);
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
