import { SetWorkspaceSkillKnowledgeBaseUseCase } from './set-workspace-skill-knowledge-base.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { SetWorkspaceSkillKnowledgeBaseUseCase as Operation } from 'src/domain/skills/application/use-cases/set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';
import { FindWorkspaceSkillUseCase as FindSkill } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
import { FindWorkspaceKnowledgeBaseUseCase as FindKnowledgeBase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base/find-workspace-knowledge-base.use-case';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    SetWorkspaceSkillKnowledgeBaseUseCase,
  );
  const access = fixture.dependency(WorkspaceAccessService);
  const find = fixture.dependency(FindSkill);
  const knowledgeBases = fixture.dependency(FindKnowledgeBase);
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue(fixture.skill);
  find.execute.mockResolvedValue(fixture.skillContext);
  knowledgeBases.execute.mockResolvedValue({
    knowledgeBase: fixture.knowledgeBase,
    isActive: true,
  });
  const command = {
    ...fixture.skillQuery,
    knowledgeBaseId: fixture.knowledgeBase.id,
    assigned: true,
  };
  return {
    ...fixture,
    operation,
    command,
    expected: fixture.skillContext,
    access,
    find,
    knowledgeBases,
  };
}
describe(SetWorkspaceSkillKnowledgeBaseUseCase.name, () => {
  it('delegates the scoped operation and returns its response', async () => {
    const fixture = await setup();
    const {
      useCase,
      operation,
      command,
      expected,
      access,
      find,
      knowledgeBases,
    } = fixture;
    await expect(useCase.execute(command)).resolves.toEqual(expected);
    expect(operation.execute).toHaveBeenCalledWith(command);
    expect(find.execute).toHaveBeenCalledWith(command);
    expect(knowledgeBases.execute).toHaveBeenCalledWith(command);
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
  it('does not require knowledge-base access when removing an assignment', async () => {
    const { useCase, command, knowledgeBases, operation } = await setup();
    await useCase.execute({ ...command, assigned: false });
    expect(knowledgeBases.execute).not.toHaveBeenCalled();
    expect(operation.execute).toHaveBeenCalledWith({
      ...command,
      assigned: false,
    });
  });
  it('rejects a knowledge base outside the workspace before assigning', async () => {
    const { useCase, command, knowledgeBases, operation } = await setup();
    const error = new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    knowledgeBases.execute.mockRejectedValue(error);
    await expect(useCase.execute(command)).rejects.toBe(error);
    expect(operation.execute).not.toHaveBeenCalled();
  });
});
