import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { FindActiveKnowledgeBasesUseCase } from './find-active-knowledge-bases.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;

async function setup() {
  const repository = { findActiveAccessible: jest.fn() };
  const principal = { userId: USER_ID, orgId: ORG_ID };
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const module = await Test.createTestingModule({
    providers: [
      FindActiveKnowledgeBasesUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: ContextService, useValue: context },
    ],
  }).compile();
  return { useCase: module.get(FindActiveKnowledgeBasesUseCase), repository };
}

describe(FindActiveKnowledgeBasesUseCase.name, () => {
  it('returns active knowledge bases accessible to the principal', async () => {
    const active = new PersonalKnowledgeBase({
      name: 'Active regulations',
      orgId: ORG_ID,
      userId: USER_ID,
    });
    const { useCase, repository } = await setup();
    repository.findActiveAccessible.mockResolvedValue([active]);

    await expect(useCase.execute()).resolves.toEqual([active]);
    expect(repository.findActiveAccessible).toHaveBeenCalledWith(
      USER_ID,
      ORG_ID,
    );
  });

  it('wraps unexpected repository errors with the knowledge-base taxonomy', async () => {
    const cause = new Error('database unavailable');
    const { useCase, repository } = await setup();
    repository.findActiveAccessible.mockRejectedValue(cause);

    const execution = useCase.execute();
    await expect(execution).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
    await expect(execution).rejects.toMatchObject({ cause });
  });
});
