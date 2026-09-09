import { randomUUID } from 'crypto';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/workspace-knowledge-base-access.service';
import { DocumentNotInKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { RemoveWorkspaceKnowledgeBaseDocumentUseCase } from './remove-workspace-knowledge-base-document/remove-workspace-knowledge-base-document.use-case';
import { SetWorkspaceKnowledgeBaseActivationUseCase } from './set-workspace-knowledge-base-activation/set-workspace-knowledge-base-activation.use-case';

function setup() {
  const knowledgeBase = new WorkspaceKnowledgeBase({
    name: 'Building rules',
    orgId: randomUUID(),
    workspaceId: randomUUID(),
  });
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    findSourceByIdAndKnowledgeBaseId: jest.fn().mockResolvedValue(null),
    deactivateForWorkspace: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseRepository>;
  return {
    knowledgeBase,
    repository,
    access: new WorkspaceKnowledgeBaseAccessService(repository),
    command: {
      workspaceId: knowledgeBase.workspaceId,
      knowledgeBaseId: knowledgeBase.id,
    },
  };
}

describe('workspace knowledge-base operations', () => {
  it('deactivates only the workspace scope', async () => {
    const { repository, access, command, knowledgeBase } = setup();
    const useCase = new SetWorkspaceKnowledgeBaseActivationUseCase(
      repository,
      access,
    );
    await expect(
      useCase.execute({ ...command, isActive: false }),
    ).resolves.toBe(knowledgeBase);
    expect(repository.deactivateForWorkspace).toHaveBeenCalledWith(
      knowledgeBase.id,
      knowledgeBase.workspaceId,
    );
  });
  it('rejects removing a document outside the knowledge base', async () => {
    const { repository, access, command } = setup();
    const deleteSource = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteSourceUseCase>;
    const useCase = new RemoveWorkspaceKnowledgeBaseDocumentUseCase(
      repository,
      access,
      deleteSource,
    );
    await expect(
      useCase.execute({ ...command, documentId: randomUUID() }),
    ).rejects.toBeInstanceOf(DocumentNotInKnowledgeBaseError);
    expect(deleteSource.execute).not.toHaveBeenCalled();
  });
});
