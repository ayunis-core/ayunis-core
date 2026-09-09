import { Test, type TestingModule } from '@nestjs/testing';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { FindActiveKnowledgeBasesUseCase } from './find-active-knowledge-bases.use-case';

describe('FindActiveKnowledgeBasesUseCase', () => {
  it('returns only active accessible knowledge bases', async () => {
    const active = new KnowledgeBase({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Active regulations',
      orgId: '22222222-2222-2222-2222-222222222222',
      userId: '33333333-3333-3333-3333-333333333333',
    });
    const accessService = {
      findActiveAccessible: jest.fn().mockResolvedValue([active]),
    } as unknown as KnowledgeBaseAccessService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindActiveKnowledgeBasesUseCase,
        { provide: KnowledgeBaseAccessService, useValue: accessService },
      ],
    }).compile();
    const useCase = module.get(FindActiveKnowledgeBasesUseCase);

    await expect(useCase.execute()).resolves.toEqual([active]);
  });

  it('wraps unexpected access errors with the knowledge-base taxonomy', async () => {
    const cause = new Error('database unavailable');
    const accessService = {
      findActiveAccessible: jest.fn().mockRejectedValue(cause),
    } as unknown as KnowledgeBaseAccessService;
    const module = await Test.createTestingModule({
      providers: [
        FindActiveKnowledgeBasesUseCase,
        { provide: KnowledgeBaseAccessService, useValue: accessService },
      ],
    }).compile();

    const execution = module.get(FindActiveKnowledgeBasesUseCase).execute();
    await expect(execution).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
    await expect(execution).rejects.toMatchObject({ cause });
  });
});
