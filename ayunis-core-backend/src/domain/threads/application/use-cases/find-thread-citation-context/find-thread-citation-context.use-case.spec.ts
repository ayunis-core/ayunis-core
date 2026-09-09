import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { FindThreadCitationContextQuery } from './find-thread-citation-context.query';
import { FindThreadCitationContextUseCase } from './find-thread-citation-context.use-case';

describe('FindThreadCitationContextUseCase', () => {
  const threadId = randomUUID();
  const userId = randomUUID();
  let repository: jest.Mocked<ThreadsRepository>;
  let contextService: jest.Mocked<ContextService>;
  let useCase: FindThreadCitationContextUseCase;

  beforeEach(() => {
    repository = {
      findCitationContext: jest.fn(),
    } as unknown as jest.Mocked<ThreadsRepository>;
    contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as jest.Mocked<ContextService>;
    useCase = new FindThreadCitationContextUseCase(repository, contextService);
  });

  it('returns the owner-scoped citation context', async () => {
    const citationContext = {
      userId,
      workspaceId: randomUUID(),
      sourceAssignments: [
        { sourceId: randomUUID(), originSkillId: randomUUID() },
      ],
      knowledgeBaseAssignments: [
        { knowledgeBaseId: randomUUID(), originSkillId: null },
      ],
    };
    repository.findCitationContext.mockResolvedValue(citationContext);

    await expect(
      useCase.execute(new FindThreadCitationContextQuery(threadId)),
    ).resolves.toBe(citationContext);
    expect(repository.findCitationContext).toHaveBeenCalledWith(
      threadId,
      userId,
    );
  });

  it('returns the same not-found error for a missing or foreign thread', async () => {
    repository.findCitationContext.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindThreadCitationContextQuery(threadId)),
    ).rejects.toThrow(ThreadNotFoundError);
  });

  it('requires an authenticated user', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindThreadCitationContextQuery(threadId)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.findCitationContext).not.toHaveBeenCalled();
  });
});
