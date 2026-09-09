import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { FindThreadContextRefsQuery } from './find-thread-context-refs.query';
import { FindThreadContextRefsUseCase } from './find-thread-context-refs.use-case';

const THREAD_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const USER_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333' as UUID;
const KNOWLEDGE_BASE_ID = '44444444-4444-4444-8444-444444444444' as UUID;

function setup() {
  const threadsRepository = {
    findContextRefs: jest.fn().mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      knowledgeBaseIds: [KNOWLEDGE_BASE_ID],
    }),
  } as unknown as jest.Mocked<ThreadsRepository>;
  const contextService = {
    get: jest.fn().mockReturnValue(USER_ID),
  } as unknown as jest.Mocked<ContextService>;
  return {
    useCase: new FindThreadContextRefsUseCase(
      threadsRepository,
      contextService,
    ),
    threadsRepository,
  };
}

describe(FindThreadContextRefsUseCase.name, () => {
  it('returns owner-scoped context references', async () => {
    const { useCase, threadsRepository } = setup();

    await expect(
      useCase.execute(new FindThreadContextRefsQuery(THREAD_ID)),
    ).resolves.toEqual({
      workspaceId: WORKSPACE_ID,
      knowledgeBaseIds: [KNOWLEDGE_BASE_ID],
    });
    expect(threadsRepository.findContextRefs).toHaveBeenCalledWith(
      THREAD_ID,
      USER_ID,
    );
  });

  it('uses the same not-found error for missing or inaccessible threads', async () => {
    const { useCase, threadsRepository } = setup();
    threadsRepository.findContextRefs.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindThreadContextRefsQuery(THREAD_ID)),
    ).rejects.toBeInstanceOf(ThreadNotFoundError);
  });
});
