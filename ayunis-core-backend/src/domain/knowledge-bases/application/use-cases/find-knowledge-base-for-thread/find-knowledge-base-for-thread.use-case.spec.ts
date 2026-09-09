import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindKnowledgeBaseForThreadUseCase } from './find-knowledge-base-for-thread.use-case';

function fixture() {
  const userId = randomUUID();
  const orgId = randomUUID();
  const threadId = randomUUID();
  const knowledgeBase = new WorkspaceKnowledgeBase({
    name: 'Regulations',
    workspaceId: randomUUID(),
    orgId,
  });
  const repository = { findById: jest.fn().mockResolvedValue(knowledgeBase) };
  const personalAccess = { findAccessibleKnowledgeBase: jest.fn() };
  const findThreads = {
    execute: jest.fn(
      async (
        query: FindThreadsByIdsQuery,
      ): Promise<Array<{ id: string; workspaceId: string | null }>> =>
        query.userId === userId && query.ids.includes(threadId)
          ? [{ id: threadId, workspaceId: knowledgeBase.workspaceId }]
          : [],
    ),
  };
  const principal: Record<string, string | undefined> = { userId, orgId };
  const context = { get: jest.fn((key: string) => principal[key]) };
  const useCase = new FindKnowledgeBaseForThreadUseCase(
    repository as unknown as KnowledgeBaseRepository,
    personalAccess as unknown as KnowledgeBaseAccessService,
    findThreads as unknown as FindThreadsByIdsUseCase,
    context as unknown as ContextService,
  );
  return {
    useCase,
    repository,
    personalAccess,
    knowledgeBase,
    findThreads,
    context,
    userId,
    orgId,
    query: { knowledgeBaseId: knowledgeBase.id, threadId },
  };
}

describe(FindKnowledgeBaseForThreadUseCase.name, () => {
  it('allows access through a trusted thread in the same workspace', async () => {
    const { useCase, query, knowledgeBase, findThreads, userId } = fixture();
    await expect(useCase.execute(query)).resolves.toBe(knowledgeBase);
    expect(findThreads.execute).toHaveBeenCalledWith(
      new FindThreadsByIdsQuery(userId, [query.threadId]),
    );
  });

  it.each([null, randomUUID()])(
    'rejects a thread with workspace %s',
    async (workspaceId) => {
      const { useCase, query, findThreads } = fixture();
      findThreads.execute.mockResolvedValue([
        { id: query.threadId, workspaceId },
      ]);
      await expect(useCase.execute(query)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
    },
  );

  it('denies a different principal before allowing the workspace owner', async () => {
    const { useCase, query, context, knowledgeBase } = fixture();
    context.get.mockReturnValueOnce(randomUUID());
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    await expect(useCase.execute(query)).resolves.toBe(knowledgeBase);
  });

  it('rejects a workspace knowledge base without a trusted thread', async () => {
    const { useCase, knowledgeBase, findThreads } = fixture();
    await expect(
      useCase.execute({ knowledgeBaseId: knowledgeBase.id }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(findThreads.execute).not.toHaveBeenCalled();
  });

  it('rejects another organization’s knowledge base before thread lookup', async () => {
    const { useCase, query, repository, knowledgeBase, findThreads } =
      fixture();
    repository.findById.mockResolvedValue(
      new WorkspaceKnowledgeBase({ ...knowledgeBase, orgId: randomUUID() }),
    );
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(findThreads.execute).not.toHaveBeenCalled();
  });

  it.each(['userId', 'orgId'])(
    'requires authenticated %s before reading resources',
    async (missingKey) => {
      const { useCase, query, context, userId, orgId, repository } = fixture();
      context.get.mockImplementation(
        (key) => ({ userId, orgId, [missingKey]: undefined })[key],
      );
      await expect(useCase.execute(query)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    },
  );

  it('preserves personal access without a thread context', async () => {
    const { useCase, repository, personalAccess, findThreads, userId, orgId } =
      fixture();
    const personal = new PersonalKnowledgeBase({
      name: 'Personal regulations',
      userId,
      orgId,
    });
    repository.findById.mockResolvedValue(personal);
    personalAccess.findAccessibleKnowledgeBase.mockResolvedValue(personal);
    await expect(
      useCase.execute({ knowledgeBaseId: personal.id }),
    ).resolves.toBe(personal);
    expect(findThreads.execute).not.toHaveBeenCalled();
  });

  it('preserves personal sharing authorization regardless of the thread workspace', async () => {
    const { useCase, query, repository, personalAccess, findThreads, orgId } =
      fixture();
    const personal = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: randomUUID(),
      orgId,
    });
    repository.findById.mockResolvedValue(personal);
    const personalQuery = { ...query, knowledgeBaseId: personal.id };
    personalAccess.findAccessibleKnowledgeBase.mockRejectedValue(
      new KnowledgeBaseNotFoundError(personal.id),
    );
    await expect(useCase.execute(personalQuery)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    personalAccess.findAccessibleKnowledgeBase.mockResolvedValue(personal);
    await expect(useCase.execute(personalQuery)).resolves.toBe(personal);
    expect(findThreads.execute).not.toHaveBeenCalled();
  });

  it('wraps unexpected failures', async () => {
    const { useCase, query, repository } = fixture();
    repository.findById.mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
  });
});
