import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { FindKnowledgeBasesByIdsUseCase } from './find-knowledge-bases-by-ids.use-case';

describe(FindKnowledgeBasesByIdsUseCase.name, () => {
  it('limits the lookup to the caller organization', async () => {
    const orgId = randomUUID();
    const ids = [randomUUID()];
    const repository = { findByIds: jest.fn().mockResolvedValue([]) };
    const useCase = new FindKnowledgeBasesByIdsUseCase(
      repository as unknown as KnowledgeBaseRepository,
      {
        get: jest.fn(getFromUserContext({ orgId })),
      } as unknown as ContextService,
    );

    await useCase.execute({ knowledgeBaseIds: ids });

    expect(repository.findByIds).toHaveBeenCalledWith(ids, { orgId });
  });

  it('does not query for an empty id list', async () => {
    const repository = { findByIds: jest.fn() };
    const useCase = new FindKnowledgeBasesByIdsUseCase(
      repository as unknown as KnowledgeBaseRepository,
      { get: jest.fn(getFromUserContext()) } as unknown as ContextService,
    );

    await expect(useCase.execute({ knowledgeBaseIds: [] })).resolves.toEqual(
      [],
    );
    expect(repository.findByIds).not.toHaveBeenCalled();
  });
});
