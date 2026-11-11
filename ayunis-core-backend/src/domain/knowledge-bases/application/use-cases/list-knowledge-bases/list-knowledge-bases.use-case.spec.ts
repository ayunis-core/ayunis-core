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
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const WORKSPACE_ID = '44444444-4444-4444-4444-444444444444' as UUID;
const TEAM_ID = '55555555-5555-5555-5555-555555555555' as UUID;
const OWNERS = { orgId: ORG_ID, teamIds: [TEAM_ID] };

async function setup() {
  const repository = {
    countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    findAllByUserId: jest.fn().mockResolvedValue([]),
    findAllByWorkspaceId: jest.fn().mockResolvedValue([]),
    findAllCollective: jest.fn().mockResolvedValue([]),
    findPaginatedAccessible: jest.fn(),
    getActiveIds: jest.fn().mockResolvedValue(new Set()),
    getWorkspaceStates: jest.fn().mockResolvedValue(new Map()),
  };
  const principal = aUserContext({ userId: USER_ID, orgId: ORG_ID });
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const workspaceRead = { execute: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      ListKnowledgeBasesUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: ContextService, useValue: context },
      { provide: AssertWorkspaceReadAccessUseCase, useValue: workspaceRead },
      {
        provide: CollectiveKnowledgeBaseAccessService,
        useValue: { readableOwners: jest.fn().mockResolvedValue(OWNERS) },
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
    const inactive = new PersonalKnowledgeBase({
      name: 'Regional planning guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    repository.findAllByUserId.mockResolvedValue([owned, inactive]);
    repository.getActiveIds.mockResolvedValue(new Set([owned.id]));
    repository.countSourcesByKnowledgeBaseIds.mockResolvedValue(
      new Map([
        [owned.id, 2],
        [inactive.id, 1],
      ]),
    );

    const result = await useCase.execute(
      new ListKnowledgeBasesQuery({ owner: { type: 'personal' } }),
    );

    expect(result.data).toEqual([
      {
        knowledgeBase: owned,
        isActive: true,
        documentCount: 2,
      },
      {
        knowledgeBase: inactive,
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

  describe('team- and org-owned knowledge bases', () => {
    const team = new TeamKnowledgeBase({
      name: 'Bauordnung',
      orgId: ORG_ID,
      teamId: TEAM_ID,
      isActive: true,
    });
    const org = new OrgKnowledgeBase({ name: 'Satzungen', orgId: ORG_ID });

    it('includes readable team and org knowledge bases with their global state', async () => {
      const { useCase, repository } = await setup();
      repository.findAllCollective.mockResolvedValue([team, org]);

      const result = await useCase.execute(
        new ListKnowledgeBasesQuery({ owner: { type: 'personal' } }),
      );

      expect(repository.findAllCollective).toHaveBeenCalledWith(OWNERS);
      expect(result.data).toEqual([
        {
          knowledgeBase: team,
          isActive: true,
          documentCount: 0,
        },
        {
          knowledgeBase: org,
          isActive: false,
          documentCount: 0,
        },
      ]);
    });

    it('passes the readable owners to the paginated query', async () => {
      const { useCase, repository } = await setup();
      repository.findPaginatedAccessible.mockResolvedValue(
        new Paginated({ data: [team], limit: 10, offset: 0, total: 1 }),
      );

      const result = await useCase.execute(
        new ListKnowledgeBasesQuery({ owner: { type: 'personal' }, limit: 10 }),
      );

      expect(repository.findPaginatedAccessible).toHaveBeenCalledWith(
        USER_ID,
        undefined,
        expect.objectContaining({ limit: 10 }),
        OWNERS,
      );
      expect(result.data).toEqual([
        {
          knowledgeBase: team,
          isActive: true,
          documentCount: 0,
        },
      ]);
    });
  });
});
