import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase } from 'src/domain/skills/application/use-cases/find-knowledge-base-ids-accessible-via-shared-skills/find-knowledge-base-ids-accessible-via-shared-skills.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { ListKnowledgeBasesUseCase } from './list-knowledge-bases.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const ORG_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const WORKSPACE_ID = '44444444-4444-4444-4444-444444444444' as UUID;

async function setup() {
  const repository = {
    countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    findAllByUserId: jest.fn().mockResolvedValue([]),
    findAllByWorkspaceId: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    findPaginatedAccessible: jest.fn(),
    getActiveIds: jest.fn().mockResolvedValue(new Set()),
    getWorkspaceStates: jest.fn().mockResolvedValue(new Map()),
  };
  const findShares = { execute: jest.fn().mockResolvedValue([]) };
  const findSkillSharedIds = { execute: jest.fn().mockResolvedValue([]) };
  const principal = { userId: USER_ID, orgId: ORG_ID };
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const workspaceRead = { execute: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      ListKnowledgeBasesUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: FindSharesByScopeUseCase, useValue: findShares },
      {
        provide: FindKnowledgeBaseIdsAccessibleViaSharedSkillsUseCase,
        useValue: findSkillSharedIds,
      },
      { provide: ContextService, useValue: context },
      { provide: AssertWorkspaceReadAccessUseCase, useValue: workspaceRead },
    ],
  }).compile();
  return {
    useCase: module.get(ListKnowledgeBasesUseCase),
    repository,
    findShares,
    workspaceRead,
  };
}

describe(ListKnowledgeBasesUseCase.name, () => {
  it('returns every owned and shared personal knowledge base by default', async () => {
    const { useCase, repository, findShares, workspaceRead } = await setup();
    const owned = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const shared = new PersonalKnowledgeBase({
      name: 'Regional planning guidance',
      userId: OTHER_USER_ID,
      orgId: ORG_ID,
    });
    repository.findAllByUserId.mockResolvedValue([owned]);
    repository.findByIds.mockResolvedValue([shared]);
    repository.getActiveIds.mockResolvedValue(new Set([owned.id]));
    findShares.execute.mockResolvedValue([{ entityId: shared.id }]);
    repository.countSourcesByKnowledgeBaseIds.mockResolvedValue(
      new Map([
        [owned.id, 2],
        [shared.id, 1],
      ]),
    );

    const result = await useCase.execute(
      new ListKnowledgeBasesQuery({ owner: { type: 'personal' } }),
    );

    expect(result.data).toEqual([
      {
        knowledgeBase: owned,
        isShared: false,
        isActive: true,
        documentCount: 2,
      },
      {
        knowledgeBase: shared,
        isShared: true,
        isActive: false,
        documentCount: 1,
      },
    ]);
    expect(result).toMatchObject({ limit: 2, offset: 0, total: 2 });
    expect(workspaceRead.execute).not.toHaveBeenCalled();
  });

  it('returns every workspace knowledge base by default', async () => {
    const { useCase, repository, workspaceRead } = await setup();
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    repository.findAllByWorkspaceId.mockResolvedValue([knowledgeBase]);
    repository.getWorkspaceStates.mockResolvedValue(
      new Map([[knowledgeBase.id, { isActive: true }]]),
    );

    const result = await useCase.execute(
      new ListKnowledgeBasesQuery({
        owner: { type: 'workspace', workspaceId: WORKSPACE_ID },
      }),
    );

    expect(result.data).toEqual([
      {
        knowledgeBase,
        isShared: false,
        isActive: true,
        documentCount: 0,
      },
    ]);
    expect(result).toMatchObject({ limit: 1, offset: 0, total: 1 });
    expect(workspaceRead.execute).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
    });
  });

  it('uses workspace activation state on the paginated path', async () => {
    const { useCase, repository } = await setup();
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    repository.findPaginatedAccessible.mockResolvedValue(
      new Paginated({ data: [knowledgeBase], limit: 10, offset: 5, total: 12 }),
    );
    repository.getWorkspaceStates.mockResolvedValue(
      new Map([[knowledgeBase.id, { isActive: true }]]),
    );

    const result = await useCase.execute(
      new ListKnowledgeBasesQuery({
        owner: { type: 'workspace', workspaceId: WORKSPACE_ID },
        search: 'regulations',
        limit: 10,
        offset: 5,
      }),
    );

    expect(result.data[0]).toMatchObject({ knowledgeBase, isActive: true });
    expect(repository.findPaginatedAccessible).toHaveBeenCalledWith(
      USER_ID,
      WORKSPACE_ID,
      [],
      { search: 'regulations', limit: 10, offset: 5 },
    );
  });

  it('marks shared personal resources on the paginated path', async () => {
    const { useCase, repository, findShares } = await setup();
    const shared = new PersonalKnowledgeBase({
      name: 'Shared regulations',
      userId: OTHER_USER_ID,
      orgId: ORG_ID,
    });
    findShares.execute.mockResolvedValue([{ entityId: shared.id }]);
    repository.findPaginatedAccessible.mockResolvedValue(
      new Paginated({ data: [shared], limit: 20, offset: 0, total: 1 }),
    );

    const result = await useCase.execute(
      new ListKnowledgeBasesQuery({
        owner: { type: 'personal' },
        limit: 20,
      }),
    );

    expect(result.data[0]).toMatchObject({
      knowledgeBase: shared,
      isShared: true,
    });
  });

  it('does not query resources when workspace access is denied', async () => {
    const { useCase, repository, workspaceRead } = await setup();
    workspaceRead.execute.mockRejectedValue(
      new WorkspaceNotFoundError(WORKSPACE_ID),
    );

    await expect(
      useCase.execute(
        new ListKnowledgeBasesQuery({
          owner: { type: 'workspace', workspaceId: WORKSPACE_ID },
          limit: 20,
          offset: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(repository.findPaginatedAccessible).not.toHaveBeenCalled();
  });

  it('wraps unexpected personal list failures', async () => {
    const { useCase, repository } = await setup();
    repository.findAllByUserId.mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      useCase.execute(
        new ListKnowledgeBasesQuery({ owner: { type: 'personal' } }),
      ),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
