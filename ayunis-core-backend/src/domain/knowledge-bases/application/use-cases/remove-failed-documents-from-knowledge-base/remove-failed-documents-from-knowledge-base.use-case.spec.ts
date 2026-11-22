import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { DeleteFailedKnowledgeBaseSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-failed-knowledge-base-sources/delete-failed-knowledge-base-sources.use-case';
import { RemoveFailedDocumentsFromKnowledgeBaseCommand } from './remove-failed-documents-from-knowledge-base.command';
import { RemoveFailedDocumentsFromKnowledgeBaseUseCase } from './remove-failed-documents-from-knowledge-base.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

async function setup(knowledgeBase: KnowledgeBase | null) {
  const removedIds = [randomUUID(), randomUUID()];
  const repository = { findById: jest.fn().mockResolvedValue(knowledgeBase) };
  const writeAccess = { requireWrite: jest.fn() };
  const deleteFailedSources = {
    execute: jest.fn().mockResolvedValue(removedIds),
  };
  const module = await Test.createTestingModule({
    providers: [
      RemoveFailedDocumentsFromKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      {
        provide: DeleteFailedKnowledgeBaseSourcesUseCase,
        useValue: deleteFailedSources,
      },
    ],
  }).compile();
  return {
    useCase: module.get(RemoveFailedDocumentsFromKnowledgeBaseUseCase),
    writeAccess,
    deleteFailedSources,
    removedIds,
  };
}

describe(RemoveFailedDocumentsFromKnowledgeBaseUseCase.name, () => {
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
    'removes the failed documents of a writable %s knowledge base in its organization',
    async (_scope, makeKnowledgeBase) => {
      const knowledgeBase = makeKnowledgeBase();
      const { useCase, deleteFailedSources, removedIds } =
        await setup(knowledgeBase);

      await expect(
        useCase.execute(
          new RemoveFailedDocumentsFromKnowledgeBaseCommand(knowledgeBase.id),
        ),
      ).resolves.toEqual(removedIds);
      expect(deleteFailedSources.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          knowledgeBaseId: knowledgeBase.id,
          orgId: ORG_ID,
        }),
      );
    },
  );

  it('removes nothing when the caller may only read the knowledge base', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: randomUUID(),
      orgId: ORG_ID,
    });
    const { useCase, writeAccess, deleteFailedSources } =
      await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(
        new RemoveFailedDocumentsFromKnowledgeBaseCommand(knowledgeBase.id),
      ),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(deleteFailedSources.execute).not.toHaveBeenCalled();
  });

  it('returns not found and removes nothing when the knowledge base does not exist', async () => {
    const { useCase, deleteFailedSources } = await setup(null);

    await expect(
      useCase.execute(
        new RemoveFailedDocumentsFromKnowledgeBaseCommand(randomUUID()),
      ),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(deleteFailedSources.execute).not.toHaveBeenCalled();
  });
});
