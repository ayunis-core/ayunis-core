import { AddWorkspaceKnowledgeBaseDocumentUseCase } from './add-workspace-knowledge-base-document.use-case';
import { workspaceOperationUseCaseFixture } from 'src/domain/workspaces/application/testing/workspace-operation-use-case.fixture';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { FindWorkspaceKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base/find-workspace-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

async function setup() {
  const fixture = await workspaceOperationUseCaseFixture(
    AddWorkspaceKnowledgeBaseDocumentUseCase,
  );
  const find = fixture.dependency(FindWorkspaceKnowledgeBaseUseCase);
  const add = fixture.dependency(AddDocumentToKnowledgeBaseUseCase);
  const source = { id: fixture.knowledgeBase.id } as FileSource;
  find.execute.mockResolvedValue({
    knowledgeBase: fixture.knowledgeBase,
    isActive: true,
  });
  add.execute.mockResolvedValue(source);
  return {
    ...fixture,
    find,
    add,
    source,
    command: { ...fixture.knowledgeBaseQuery, file: fixture.file },
  };
}

describe(AddWorkspaceKnowledgeBaseDocumentUseCase.name, () => {
  it('checks nested-route membership and delegates to the shared upload operation', async () => {
    const { useCase, command, find, add, source } = await setup();
    await expect(useCase.execute(command)).resolves.toBe(source);
    expect(find.execute).toHaveBeenCalledWith({
      workspaceId: command.workspaceId,
      knowledgeBaseId: command.knowledgeBaseId,
    });
    expect(add.execute).toHaveBeenCalledWith({
      knowledgeBaseId: command.knowledgeBaseId,
      file: command.file,
    });
    expect(find.execute.mock.invocationCallOrder[0]).toBeLessThan(
      add.execute.mock.invocationCallOrder[0],
    );
  });
  it('does not upload when the knowledge base belongs to a different workspace', async () => {
    const { useCase, command, find, add } = await setup();
    find.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(command.knowledgeBaseId),
    );
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(add.execute).not.toHaveBeenCalled();
  });
  it('preserves authorization denial from the shared operation', async () => {
    const { useCase, command, add } = await setup();
    const error = new WorkspaceNotFoundError(command.workspaceId);
    add.execute.mockRejectedValue(error);
    await expect(useCase.execute(command)).rejects.toBe(error);
  });
  it('wraps unexpected upload failures', async () => {
    const { useCase, command, add } = await setup();
    add.execute.mockRejectedValue(new Error('Upload failed'));
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedWorkspaceError,
    );
  });
});
