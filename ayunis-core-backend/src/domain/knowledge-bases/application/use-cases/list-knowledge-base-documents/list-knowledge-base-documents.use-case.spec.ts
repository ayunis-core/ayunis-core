import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { ListKnowledgeBaseDocumentsQuery } from './list-knowledge-base-documents.query';
import { ListKnowledgeBaseDocumentsUseCase } from './list-knowledge-base-documents.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const ORG_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const WORKSPACE_ID = '44444444-4444-4444-4444-444444444444' as UUID;

async function setup(knowledgeBase: KnowledgeBase) {
  const documents = [
    { id: randomUUID(), name: 'permit-guidance.pdf' } as Source,
  ];
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    findSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue(documents),
  };
  const readAccess = {
    requireRead: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseReadAccessService>;
  const module = await Test.createTestingModule({
    providers: [
      ListKnowledgeBaseDocumentsUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseReadAccessService, useValue: readAccess },
    ],
  }).compile();
  return {
    useCase: module.get(ListKnowledgeBaseDocumentsUseCase),
    repository,
    readAccess,
    documents,
  };
}

describe(ListKnowledgeBaseDocumentsUseCase.name, () => {
  it.each([
    [
      'owned personal',
      new PersonalKnowledgeBase({
        name: 'Permit guidance',
        userId: USER_ID,
        orgId: ORG_ID,
      }),
    ],
    [
      'shared personal',
      new PersonalKnowledgeBase({
        name: 'Regional planning guidance',
        userId: OTHER_USER_ID,
        orgId: ORG_ID,
      }),
    ],
    [
      'workspace',
      new WorkspaceKnowledgeBase({
        name: 'Project regulations',
        workspaceId: WORKSPACE_ID,
        orgId: ORG_ID,
      }),
    ],
  ])(
    'lists documents for an accessible %s knowledge base',
    async (_scope, knowledgeBase) => {
      const { useCase, documents, readAccess } = await setup(knowledgeBase);

      await expect(
        useCase.execute(new ListKnowledgeBaseDocumentsQuery(knowledgeBase.id)),
      ).resolves.toEqual(documents);
      expect(readAccess.requireRead).toHaveBeenCalledWith(knowledgeBase);
    },
  );

  it('does not expose documents when owner-aware read access is denied', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Restricted project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: randomUUID(),
    });
    const { useCase, repository, readAccess } = await setup(knowledgeBase);
    readAccess.requireRead.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(new ListKnowledgeBaseDocumentsQuery(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(repository.findSourcesByKnowledgeBaseId).not.toHaveBeenCalled();
  });

  it('returns not found without listing when the entity does not exist', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, readAccess } = await setup(knowledgeBase);
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new ListKnowledgeBaseDocumentsQuery(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(readAccess.requireRead).not.toHaveBeenCalled();
    expect(repository.findSourcesByKnowledgeBaseId).not.toHaveBeenCalled();
  });
});
