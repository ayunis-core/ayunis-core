import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindAccessibleKnowledgeBaseUseCase } from './find-accessible-knowledge-base.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;

async function setup() {
  const repository = { findById: jest.fn() };
  const readAccess = { requireRead: jest.fn() };
  const principal = { userId: USER_ID, orgId: ORG_ID };
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const module = await Test.createTestingModule({
    providers: [
      FindAccessibleKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseReadAccessService, useValue: readAccess },
      { provide: ContextService, useValue: context },
    ],
  }).compile();
  return {
    useCase: module.get(FindAccessibleKnowledgeBaseUseCase),
    repository,
    readAccess,
  };
}

describe(FindAccessibleKnowledgeBaseUseCase.name, () => {
  it('returns an accessible personal knowledge base in the principal organization', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, readAccess } = await setup();
    repository.findById.mockResolvedValue(knowledgeBase);

    await expect(
      useCase.execute({ knowledgeBaseId: knowledgeBase.id }),
    ).resolves.toBe(knowledgeBase);
    expect(readAccess.requireRead).toHaveBeenCalledWith(knowledgeBase);
  });

  it.each([
    new PersonalKnowledgeBase({
      name: 'Foreign regulations',
      userId: USER_ID,
      orgId: '33333333-3333-3333-3333-333333333333',
    }),
    new WorkspaceKnowledgeBase({
      name: 'Workspace regulations',
      workspaceId: '44444444-4444-4444-4444-444444444444',
      orgId: ORG_ID,
    }),
  ])('hides an inaccessible knowledge-base owner scope', async (resource) => {
    const { useCase, repository, readAccess } = await setup();
    repository.findById.mockResolvedValue(resource);

    await expect(
      useCase.execute({ knowledgeBaseId: resource.id }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(readAccess.requireRead).not.toHaveBeenCalled();
  });
});
