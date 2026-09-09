import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
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
  const access = {
    requireRead: jest.fn().mockResolvedValue(undefined),
    requireExecution: jest.fn().mockResolvedValue(undefined),
  };
  const principal: Record<string, string | undefined> = { userId, orgId };
  const context = { get: jest.fn((key: string) => principal[key]) };
  const useCase = new FindKnowledgeBaseForThreadUseCase(
    repository as unknown as KnowledgeBaseRepository,
    access as unknown as KnowledgeBaseReadAccessService,
    context as unknown as ContextService,
  );
  return {
    useCase,
    repository,
    access,
    knowledgeBase,
    context,
    userId,
    orgId,
    query: { knowledgeBaseId: knowledgeBase.id, threadId },
  };
}

describe(FindKnowledgeBaseForThreadUseCase.name, () => {
  it('authorizes workspace access through the execution capability', async () => {
    const { useCase, query, knowledgeBase, access } = fixture();
    await expect(useCase.execute(query)).resolves.toBe(knowledgeBase);
    expect(access.requireExecution).toHaveBeenCalledWith(
      knowledgeBase,
      query.threadId,
    );
  });

  it('preserves trusted execution denial as resource not found', async () => {
    const { useCase, query, access } = fixture();
    access.requireExecution.mockRejectedValue(
      new KnowledgeBaseNotFoundError(query.knowledgeBaseId),
    );
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
  });

  it('rejects a workspace knowledge base without a trusted thread', async () => {
    const { useCase, knowledgeBase, access } = fixture();
    await expect(
      useCase.execute({ knowledgeBaseId: knowledgeBase.id }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(access.requireRead).not.toHaveBeenCalled();
    expect(access.requireExecution).not.toHaveBeenCalled();
  });

  it('rejects another organization’s knowledge base before authorization', async () => {
    const { useCase, query, repository, knowledgeBase, access } = fixture();
    repository.findById.mockResolvedValue(
      new WorkspaceKnowledgeBase({ ...knowledgeBase, orgId: randomUUID() }),
    );
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(access.requireExecution).not.toHaveBeenCalled();
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
    const { useCase, repository, access, userId, orgId } = fixture();
    const personal = new PersonalKnowledgeBase({
      name: 'Personal regulations',
      userId,
      orgId,
    });
    repository.findById.mockResolvedValue(personal);
    await expect(
      useCase.execute({ knowledgeBaseId: personal.id }),
    ).resolves.toBe(personal);
    expect(access.requireRead).toHaveBeenCalledWith(personal);
    expect(access.requireExecution).not.toHaveBeenCalled();
  });

  it('preserves personal sharing denial', async () => {
    const { useCase, repository, access, orgId } = fixture();
    const personal = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: randomUUID(),
      orgId,
    });
    repository.findById.mockResolvedValue(personal);
    access.requireRead.mockRejectedValue(
      new KnowledgeBaseNotFoundError(personal.id),
    );
    await expect(
      useCase.execute({ knowledgeBaseId: personal.id }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('wraps unexpected failures', async () => {
    const { useCase, query, repository } = fixture();
    repository.findById.mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
  });
});
