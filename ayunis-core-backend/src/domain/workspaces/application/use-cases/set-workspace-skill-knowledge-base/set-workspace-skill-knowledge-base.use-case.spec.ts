import { SetWorkspaceSkillKnowledgeBaseUseCase } from './set-workspace-skill-knowledge-base.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { SetWorkspaceSkillKnowledgeBaseUseCase as Operation } from 'src/domain/skills/application/use-cases/set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';
import { FindWorkspaceSkillUseCase as FindSkill } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
import { FindKnowledgeBaseUseCase as FindKnowledgeBase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { FindKnowledgeBaseQuery } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.query';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    SetWorkspaceSkillKnowledgeBaseUseCase,
  );
  const access = fixture.dependency(AssertWorkspaceWriteAccessUseCase);
  const find = fixture.dependency(FindSkill);
  const knowledgeBases = fixture.dependency(FindKnowledgeBase);
  const operation = fixture.dependency(Operation);
  operation.execute.mockResolvedValue(fixture.skill);
  find.execute.mockResolvedValue(fixture.skillContext);
  knowledgeBases.execute.mockResolvedValue({
    knowledgeBase: fixture.knowledgeBase,
    isActive: true,
    isShared: false,
    documentCount: 0,
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
    expect(knowledgeBases.execute).toHaveBeenCalledWith(
      new FindKnowledgeBaseQuery(command.knowledgeBaseId),
    );
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
  it('does not require knowledge-base access when removing an assignment', async () => {
    const { useCase, command, knowledgeBases, operation } = await setup();
    await useCase.execute({ ...command, assigned: false });
    expect(knowledgeBases.execute).not.toHaveBeenCalled();
    expect(operation.execute).toHaveBeenCalledWith({
      ...command,
      assigned: false,
    });
  });

  it('rejects a readable knowledge base owned by another workspace', async () => {
    const {
      useCase,
      command,
      knowledgeBases,
      operation,
      knowledgeBase: fixtureKnowledgeBase,
    } = await setup();
    knowledgeBases.execute.mockResolvedValue({
      knowledgeBase: new WorkspaceKnowledgeBase({
        name: 'Other workspace knowledge',
        workspaceId: '99999999-9999-4999-8999-999999999999',
        orgId: fixtureKnowledgeBase.orgId,
      }),
      isActive: true,
      isShared: false,
      documentCount: 0,
    });

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(operation.execute).not.toHaveBeenCalled();
  });

  it('rejects a knowledge base outside the workspace before assigning', async () => {
    const { useCase, command, knowledgeBases, operation } = await setup();
    const error = new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    knowledgeBases.execute.mockRejectedValue(error);
    await expect(useCase.execute(command)).rejects.toBe(error);
    expect(operation.execute).not.toHaveBeenCalled();
  });
});
