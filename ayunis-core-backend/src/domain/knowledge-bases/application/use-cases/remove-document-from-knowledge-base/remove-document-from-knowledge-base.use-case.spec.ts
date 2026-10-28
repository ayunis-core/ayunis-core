import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import {
  DocumentNotInKnowledgeBaseError,
  KnowledgeBaseNotFoundError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { RemoveDocumentFromKnowledgeBaseCommand } from './remove-document-from-knowledge-base.command';
import { RemoveDocumentFromKnowledgeBaseUseCase } from './remove-document-from-knowledge-base.use-case';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

function command(
  knowledgeBaseId: UUID,
  documentId: UUID,
): RemoveDocumentFromKnowledgeBaseCommand {
  return new RemoveDocumentFromKnowledgeBaseCommand({
    knowledgeBaseId,
    documentId,
  });
}

async function setup(knowledgeBase: KnowledgeBase) {
  const documentId = randomUUID();
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    findSourceByIdAndKnowledgeBaseId: jest
      .fn()
      .mockResolvedValue({ id: documentId }),
  };
  const writeAccess = {
    requireWrite: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseWriteAccessService>;
  const deleteSource = { execute: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      RemoveDocumentFromKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: DeleteSourceUseCase, useValue: deleteSource },
    ],
  }).compile();
  return {
    useCase: module.get(RemoveDocumentFromKnowledgeBaseUseCase),
    repository,
    writeAccess,
    deleteSource,
    documentId,
  };
}

describe(RemoveDocumentFromKnowledgeBaseUseCase.name, () => {
  it.each([
    [
      'personal',
      () =>
        new PersonalKnowledgeBase({
          name: 'Permit regulations',
          userId: USER_ID,
          orgId: ORG_ID,
        }),
    ],
    [
      'workspace',
      () =>
        new WorkspaceKnowledgeBase({
          name: 'Project regulations',
          workspaceId: WORKSPACE_ID,
          orgId: ORG_ID,
        }),
    ],
  ])(
    'removes a document from an authorized %s knowledge base by entity id',
    async (_scope, makeKnowledgeBase) => {
      const knowledgeBase = makeKnowledgeBase();
      const { useCase, deleteSource, documentId } = await setup(knowledgeBase);

      await expect(
        useCase.execute(command(knowledgeBase.id, documentId)),
      ).resolves.toBeUndefined();
      expect(deleteSource.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: documentId,
          orgId: knowledgeBase.orgId,
        }),
      );
    },
  );

  it('does not inspect or delete a document when owner authorization is denied', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: randomUUID(),
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess, deleteSource, documentId } =
      await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(command(knowledgeBase.id, documentId)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(repository.findSourceByIdAndKnowledgeBaseId).not.toHaveBeenCalled();
    expect(deleteSource.execute).not.toHaveBeenCalled();
  });

  it('keeps document membership scoped to the persisted knowledge base', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, deleteSource, documentId } =
      await setup(knowledgeBase);
    repository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(null);

    await expect(
      useCase.execute(command(knowledgeBase.id, documentId)),
    ).rejects.toBeInstanceOf(DocumentNotInKnowledgeBaseError);
    expect(deleteSource.execute).not.toHaveBeenCalled();
  });

  it('returns not found without inspecting the document when the entity does not exist', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess, deleteSource, documentId } =
      await setup(knowledgeBase);
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(command(knowledgeBase.id, documentId)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(writeAccess.requireWrite).not.toHaveBeenCalled();
    expect(repository.findSourceByIdAndKnowledgeBaseId).not.toHaveBeenCalled();
    expect(deleteSource.execute).not.toHaveBeenCalled();
  });

  it('does not inspect or delete a cross-organization document', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Foreign project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: randomUUID(),
    });
    const { useCase, repository, writeAccess, deleteSource, documentId } =
      await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(command(knowledgeBase.id, documentId)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(repository.findSourceByIdAndKnowledgeBaseId).not.toHaveBeenCalled();
    expect(deleteSource.execute).not.toHaveBeenCalled();
  });
});
