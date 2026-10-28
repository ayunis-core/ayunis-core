import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { AccessibleKnowledgeBasesByIdsRepository } from 'src/domain/knowledge-bases/application/ports/accessible-knowledge-bases-by-ids.repository';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { FindAccessibleKnowledgeBasesByIdsUseCase } from './find-accessible-knowledge-bases-by-ids.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const FIRST_ID = '33333333-3333-4333-8333-333333333333' as UUID;
const STALE_ID = '44444444-4444-4444-8444-444444444444' as UUID;

function setup() {
  const knowledgeBase = new PersonalKnowledgeBase({
    id: FIRST_ID,
    name: 'Accessible building regulations',
    userId: USER_ID,
    orgId: ORG_ID,
  });
  const repository = {
    findAccessibleByIds: jest.fn().mockResolvedValue([knowledgeBase]),
  } as unknown as jest.Mocked<AccessibleKnowledgeBasesByIdsRepository>;
  const contextService = {
    get: jest.fn((key: string) => (key === 'userId' ? USER_ID : ORG_ID)),
  } as unknown as jest.Mocked<ContextService>;
  return {
    useCase: new FindAccessibleKnowledgeBasesByIdsUseCase(
      repository,
      contextService,
    ),
    repository,
    knowledgeBase,
  };
}

describe(FindAccessibleKnowledgeBasesByIdsUseCase.name, () => {
  it('returns the accessible subset of requested knowledge bases', async () => {
    const { useCase, repository, knowledgeBase } = setup();

    await expect(
      useCase.execute({ knowledgeBaseIds: [FIRST_ID, STALE_ID, FIRST_ID] }),
    ).resolves.toEqual([knowledgeBase]);
    expect(repository.findAccessibleByIds).toHaveBeenCalledWith(
      [FIRST_ID, STALE_ID],
      USER_ID,
      ORG_ID,
    );
  });

  it('does not resolve access when no knowledge bases are requested', async () => {
    const { useCase, repository } = setup();

    await expect(useCase.execute({ knowledgeBaseIds: [] })).resolves.toEqual(
      [],
    );
    expect(repository.findAccessibleByIds).not.toHaveBeenCalled();
  });

  it('preserves unexpected lookup errors', async () => {
    const { useCase, repository } = setup();
    const error = new UnexpectedKnowledgeBaseError(
      new Error('database offline'),
    );
    repository.findAccessibleByIds.mockRejectedValue(error);

    await expect(
      useCase.execute({ knowledgeBaseIds: [FIRST_ID] }),
    ).rejects.toBe(error);
  });
});
