import { RemoveWorkspaceSkillSourceUseCase } from './remove-workspace-skill-source.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceSkillUseCase as FindSkill } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { RemoveSourceFromSkillUseCase as Operation } from 'src/domain/skills/application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    RemoveWorkspaceSkillSourceUseCase,
  );
  const find = fixture.dependency(FindSkill);
  const operation = fixture.dependency(Operation);
  find.execute.mockResolvedValue(fixture.skillContext);
  const command = { ...fixture.skillQuery, sourceId: fixture.skill.id };
  return { ...fixture, operation, command, expected: undefined, find };
}
describe(RemoveWorkspaceSkillSourceUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, find } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.executeForAuthorizedSkill).toHaveBeenCalledWith(
      fixture.skill,
      command.sourceId,
    );
    expect(find.execute).toHaveBeenCalledWith(command);
  });
  it('does not execute the operation when workspace authorization fails', async () => {
    const { useCase, operation, command, find } = await setup();
    const error = new WorkspaceNotFoundError(command.workspaceId);
    find.execute.mockRejectedValue(error);
    await expect(useCase.execute(command)).rejects.toBe(error);
    expect(operation.executeForAuthorizedSkill).not.toHaveBeenCalled();
  });
  it('wraps unexpected operation failures', async () => {
    const { useCase, operation, command } = await setup();
    operation.executeForAuthorizedSkill.mockRejectedValue(
      new Error('Operation failed'),
    );
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedWorkspaceError,
    );
  });
});
