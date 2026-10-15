import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { KnowledgeBaseOwnershipContextService } from 'src/domain/knowledge-bases/application/services/knowledge-base-ownership-context.service';
import { BuildOwnershipLookupUseCase } from 'src/domain/ownership/application/use-cases/build-ownership-lookup/build-ownership-lookup.use-case';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import {
  anOwnershipLookup,
  anOwnershipViewer,
} from 'src/domain/ownership/application/testing/ownership.fixtures';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { Test } from '@nestjs/testing';
import { aUserContext } from 'src/common/context/testing/context.fixtures';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { ListKnowledgeBasesUseCase } from './list-knowledge-bases.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
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
  const principal = aUserContext({ userId: USER_ID, orgId: ORG_ID });
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const workspaceRead = { execute: jest.fn() };
  const viewer = anOwnershipViewer({
    userId: USER_ID,
    orgId: ORG_ID,
    permissions: [Permission.MANAGE_OWN_KNOWLEDGE],
  });
  const module = await Test.createTestingModule({
    providers: [
      ListKnowledgeBasesUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: ContextService, useValue: context },
      { provide: AssertWorkspaceReadAccessUseCase, useValue: workspaceRead },
      {
        provide: CollectiveKnowledgeBaseRepository,
        useValue: {
          findUsable: jest.fn().mockResolvedValue([]),
          getActiveStates: jest.fn().mockResolvedValue(new Map()),
        },
      },
      KnowledgeBaseOwnershipContextService,
      {
        provide: BuildOwnershipLookupUseCase,
        useValue: {
          execute: jest
            .fn()
            .mockResolvedValue(anOwnershipLookup('knowledge_base', viewer)),
        },
      },
      {
        provide: GetOwnershipViewerUseCase,
        useValue: { execute: jest.fn().mockResolvedValue(viewer) },
      },
    ],
  }).compile();
  return {
    useCase: module.get(ListKnowledgeBasesUseCase),
    repository,
    workspaceRead,
  };
}

describe(ListKnowledgeBasesUseCase.name, () => {
  it('returns every owned personal knowledge base by default', async () => {
    const { useCase, repository, workspaceRead } = await setup();
    const owned = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    repository.findAllByUserId.mockResolvedValue([owned]);
    repository.getActiveIds.mockResolvedValue(new Set([owned.id]));
    repository.countSourcesByKnowledgeBaseIds.mockResolvedValue(
      new Map([[owned.id, 2]]),
    );

    const result = await useCase.execute(
      new ListKnowledgeBasesQuery({ owner: { type: 'personal' } }),
    );

    expect(result.data).toEqual([
      {
        knowledgeBase: owned,
        isActive: true,
        documentCount: 2,
        viewer: { canUse: true, canEdit: true },
        ownerDescription: undefined,
      },
    ]);
    expect(result).toMatchObject({ limit: 1, offset: 0, total: 1 });
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
      { search: 'regulations', limit: 10, offset: 5 },
    );
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
