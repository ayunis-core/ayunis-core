import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import type { KnowledgeBaseAccessService } from './knowledge-base-access.service';
import { KnowledgeBaseToolAccessService } from './knowledge-base-tool-access.service';

describe(KnowledgeBaseToolAccessService.name, () => {
  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const threadId = randomUUID();
  const kb = new WorkspaceKnowledgeBase({
    name: 'Building regulations',
    orgId,
    workspaceId,
  });
  let principal = ownerId;
  const repository = { findById: jest.fn() };
  const personalAccess = { findAccessibleKnowledgeBase: jest.fn() };
  const findThreads = { execute: jest.fn() };
  const service = new KnowledgeBaseToolAccessService(
    repository as unknown as KnowledgeBaseRepository,
    personalAccess as unknown as KnowledgeBaseAccessService,
    findThreads as unknown as FindThreadsByIdsUseCase,
    {
      get: (key: string) => (key === 'userId' ? principal : orgId),
    } as unknown as ContextService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    principal = ownerId;
    repository.findById.mockResolvedValue(kb);
    findThreads.execute.mockImplementation(async ({ userId, ids }) =>
      userId === ownerId && ids.includes(threadId)
        ? [{ id: threadId, workspaceId }]
        : [],
    );
  });

  it('denies a different principal before allowing the workspace owner', async () => {
    principal = otherUserId;
    await expect(
      service.findAccessibleKnowledgeBase(kb.id, threadId),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    principal = ownerId;
    await expect(
      service.findAccessibleKnowledgeBase(kb.id, threadId),
    ).resolves.toBe(kb);
  });

  it('does not authorize a workspace KB without a trusted thread', async () => {
    await expect(
      service.findAccessibleKnowledgeBase(kb.id),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it.each([null, randomUUID()])(
    'rejects a thread in another workspace (%s)',
    async (workspaceId) => {
      findThreads.execute.mockResolvedValue([{ id: threadId, workspaceId }]);
      await expect(
        service.findAccessibleKnowledgeBase(kb.id, threadId),
      ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    },
  );

  it('rejects knowledge from another organization', async () => {
    repository.findById.mockResolvedValue(
      new WorkspaceKnowledgeBase({ ...kb, orgId: randomUUID() }),
    );
    await expect(
      service.findAccessibleKnowledgeBase(kb.id, threadId),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('preserves personal sharing authorization, regardless of the thread workspace', async () => {
    const personal = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: otherUserId,
      orgId,
    });
    repository.findById.mockResolvedValue(personal);
    personalAccess.findAccessibleKnowledgeBase.mockRejectedValue(
      new KnowledgeBaseNotFoundError(personal.id),
    );
    await expect(
      service.findAccessibleKnowledgeBase(personal.id, threadId),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    personalAccess.findAccessibleKnowledgeBase.mockResolvedValue(personal);
    await expect(
      service.findAccessibleKnowledgeBase(personal.id, threadId),
    ).resolves.toBe(personal);
  });
});
