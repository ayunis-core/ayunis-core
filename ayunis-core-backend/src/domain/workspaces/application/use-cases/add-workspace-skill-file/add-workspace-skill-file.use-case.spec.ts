import { AddWorkspaceSkillFileUseCase } from './add-workspace-skill-file.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceSkillUseCase as FindSkill } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { AddFileSourceToSkillUseCase as Operation } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    AddWorkspaceSkillFileUseCase,
  );
  const find = fixture.dependency(FindSkill);
  const operation = fixture.dependency(Operation);
  find.execute.mockResolvedValue(fixture.skillContext);
  operation.executeForAuthorizedSkill.mockResolvedValue(fixture.skill);
  const command = { ...fixture.skillQuery, file: fixture.uploadedFile };
  return {
    ...fixture,
    operation,
    command,
    expected: fixture.skillContext,
    find,
  };
}
describe(AddWorkspaceSkillFileUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, find } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.executeForAuthorizedSkill).toHaveBeenCalledWith(
      fixture.skill,
      command.file,
    );
    expect(find.execute).toHaveBeenCalledTimes(2);
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
