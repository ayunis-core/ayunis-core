import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindAccessibleKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-accessible-knowledge-base/find-accessible-knowledge-base.use-case';
import { GetAccessibleKnowledgeBaseContextsUseCase } from './get-accessible-knowledge-base-contexts.use-case';

function setup() {
  const ownerId = randomUUID(),
    recipientId = randomUUID(),
    orgId = randomUUID();
  const knowledgeBase = new PersonalKnowledgeBase({
    name: 'Permit regulations',
    userId: ownerId,
    orgId,
  });
  const principal = { userId: ownerId, orgId };
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    getActiveIds: jest.fn().mockResolvedValue(new Set()),
    countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
  };
  const directShare = { execute: jest.fn().mockResolvedValue(null) };
  const skillShare = { execute: jest.fn().mockResolvedValue(false) };
  const context = {
    get: (key: keyof typeof principal) => principal[key],
  } as unknown as ContextService;
  const readAccess = new KnowledgeBaseReadAccessService(
    ...([
      directShare,
      skillShare,
      { execute: jest.fn() },
      { execute: jest.fn() },
      context,
    ] as unknown as ConstructorParameters<
      typeof KnowledgeBaseReadAccessService
    >),
  );
  const find = new FindAccessibleKnowledgeBaseUseCase(
    repository as unknown as KnowledgeBaseRepository,
    readAccess,
    context,
  );
  const useCase = new GetAccessibleKnowledgeBaseContextsUseCase(
    find,
    repository as unknown as KnowledgeBaseRepository,
    context,
  );
  return {
    useCase,
    find,
    knowledgeBase,
    principal,
    recipientId,
    repository,
    directShare,
    skillShare,
  };
}

describe(GetAccessibleKnowledgeBaseContextsUseCase.name, () => {
  it('returns personal ownership and per-user activation, deduplicating inputs', async () => {
    const { useCase, knowledgeBase, repository, principal } = setup();
    repository.getActiveIds.mockResolvedValue(new Set([knowledgeBase.id]));
    repository.countSourcesByKnowledgeBaseIds.mockResolvedValue(
      new Map([[knowledgeBase.id, 3]]),
    );
    await expect(
      useCase.execute({
        knowledgeBaseIds: [knowledgeBase.id, knowledgeBase.id],
      }),
    ).resolves.toEqual([
      { knowledgeBase, isActive: true, isShared: false, documentCount: 3 },
    ]);
    expect(repository.getActiveIds).toHaveBeenCalledTimes(1);
    expect(repository.getActiveIds).toHaveBeenCalledWith(principal.userId);
    expect(repository.findById).toHaveBeenCalledTimes(1);
  });

  it.each(['direct', 'skill'])(
    'preserves %s-share grants and revocation for another principal',
    async (kind) => {
      const {
        useCase,
        knowledgeBase,
        principal,
        recipientId,
        directShare,
        skillShare,
      } = setup();
      principal.userId = recipientId;
      const query = { knowledgeBaseIds: [knowledgeBase.id] };
      await expect(useCase.execute(query)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
      if (kind === 'direct')
        directShare.execute.mockResolvedValue({ id: randomUUID() });
      else skillShare.execute.mockResolvedValue(true);
      await expect(useCase.execute(query)).resolves.toEqual([
        { knowledgeBase, isActive: false, isShared: true, documentCount: 0 },
      ]);
      directShare.execute.mockResolvedValue(null);
      skillShare.execute.mockResolvedValue(false);
      await expect(useCase.execute(query)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
    },
  );

  it('denies another organization even if the sharing collaborator grants access', async () => {
    const { find, knowledgeBase, principal, recipientId, directShare } =
      setup();
    principal.userId = recipientId;
    principal.orgId = randomUUID();
    directShare.execute.mockResolvedValue({ id: randomUUID() });
    await expect(
      find.execute({ knowledgeBaseId: knowledgeBase.id }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('never resolves workspace ownership through personal sharing', async () => {
    const { useCase, repository, principal, directShare } = setup();
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: randomUUID(),
      orgId: principal.orgId,
    });
    repository.findById.mockResolvedValue(knowledgeBase);
    directShare.execute.mockResolvedValue({ id: randomUUID() });
    await expect(
      useCase.execute({ knowledgeBaseIds: [knowledgeBase.id] }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('does not query persistence for an empty list', async () => {
    const { useCase, repository } = setup();
    await expect(useCase.execute({ knowledgeBaseIds: [] })).resolves.toEqual(
      [],
    );
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.getActiveIds).not.toHaveBeenCalled();
  });

  it('wraps asynchronous activation lookup failures', async () => {
    const { useCase, knowledgeBase, repository } = setup();
    repository.getActiveIds.mockRejectedValue(new Error('Connection lost'));
    await expect(
      useCase.execute({ knowledgeBaseIds: [knowledgeBase.id] }),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
