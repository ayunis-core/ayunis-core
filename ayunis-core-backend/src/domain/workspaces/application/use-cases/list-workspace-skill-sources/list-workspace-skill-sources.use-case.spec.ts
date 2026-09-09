import { ListWorkspaceSkillSourcesUseCase } from './list-workspace-skill-sources.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceSkillUseCase as FindSkill } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { ListSkillSourcesUseCase as Operation } from 'src/domain/skills/application/use-cases/list-skill-sources/list-skill-sources.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    ListWorkspaceSkillSourcesUseCase,
  );
  const find = fixture.dependency(FindSkill);
  const sources = [{ id: fixture.skill.id }] as Source[];
  const operation = fixture.dependency(Operation);
  find.execute.mockResolvedValue(fixture.skillContext);
  operation.executeForAuthorizedSkill.mockResolvedValue(sources);
  const command = fixture.skillQuery;
  return { ...fixture, operation, command, expected: sources, find, sources };
}
describe(ListWorkspaceSkillSourcesUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const { useCase, operation, command, expected, find } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.executeForAuthorizedSkill).toHaveBeenCalledWith(
      fixture.skill,
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
