import { KnowledgeBaseOwnershipContextService } from 'src/domain/knowledge-bases/application/services/knowledge-base-ownership-context.service';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { BuildOwnershipLookupUseCase } from 'src/domain/ownership/application/use-cases/build-ownership-lookup/build-ownership-lookup.use-case';
import {
  anOwnershipLookup,
  anOwnershipViewer,
} from 'src/domain/ownership/application/testing/ownership.fixtures';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { Test } from '@nestjs/testing';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { randomUUID, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import { FindKnowledgeBaseUseCase } from './find-knowledge-base.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const ORG_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const WORKSPACE_ID = '44444444-4444-4444-4444-444444444444' as UUID;

function query(id: UUID): FindKnowledgeBaseQuery {
  return new FindKnowledgeBaseQuery(id);
}

async function setup(knowledgeBase: KnowledgeBase) {
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    isActive: jest.fn().mockResolvedValue(true),
    getWorkspaceStates: jest
      .fn()
      .mockResolvedValue(new Map([[knowledgeBase.id, { isActive: true }]])),
    countSourcesByKnowledgeBaseIds: jest
      .fn()
      .mockResolvedValue(new Map([[knowledgeBase.id, 2]])),
  };
  const readAccess = {
    requireView: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseReadAccessService>;
  const context = {
    get: jest.fn(getFromUserContext({ userId: USER_ID, orgId: ORG_ID })),
  };
  const module = await Test.createTestingModule({
    providers: [
      FindKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseReadAccessService, useValue: readAccess },
      { provide: ContextService, useValue: context },
      KnowledgeBaseOwnershipContextService,
      {
        provide: BuildOwnershipLookupUseCase,
        useValue: {
          execute: jest.fn().mockResolvedValue(
            anOwnershipLookup(
              'knowledge_base',
              anOwnershipViewer({
                userId: USER_ID,
                orgId: ORG_ID,
                permissions: [Permission.MANAGE_OWN_KNOWLEDGE],
              }),
            ),
          ),
        },
      },
      {
        provide: CollectiveKnowledgeBaseRepository,
        useValue: { getActiveStates: jest.fn().mockResolvedValue(new Map()) },
      },
    ],
  }).compile();
  return {
    useCase: module.get(FindKnowledgeBaseUseCase),
    repository,
    readAccess,
  };
}

describe(FindKnowledgeBaseUseCase.name, () => {
  it('returns a personal knowledge base owned by the authenticated user', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, readAccess } = await setup(knowledgeBase);

    await expect(useCase.execute(query(knowledgeBase.id))).resolves.toEqual({
      knowledgeBase,
      isShared: false,
      isActive: true,
      documentCount: 2,
      viewer: { canUse: true, canEdit: true },
      ownerDescription: undefined,
    });
    expect(readAccess.requireView).toHaveBeenCalledWith(knowledgeBase);
  });

  it('preserves read access to a personal knowledge base shared by another user', async () => {
    const sharedKnowledgeBase = new PersonalKnowledgeBase({
      name: 'Regional planning guidance',
      userId: OTHER_USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, readAccess } = await setup(sharedKnowledgeBase);

    await expect(
      useCase.execute(query(sharedKnowledgeBase.id)),
    ).resolves.toEqual({
      knowledgeBase: sharedKnowledgeBase,
      isShared: true,
      isActive: true,
      documentCount: 2,
      viewer: { canUse: false, canEdit: false },
      ownerDescription: undefined,
    });
    expect(readAccess.requireView).toHaveBeenCalledWith(sharedKnowledgeBase);
  });

  it('returns an authorized workspace knowledge base without a caller-supplied workspace id', async () => {
    const workspaceKnowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, readAccess } = await setup(workspaceKnowledgeBase);

    await expect(
      useCase.execute(query(workspaceKnowledgeBase.id)),
    ).resolves.toEqual({
      knowledgeBase: workspaceKnowledgeBase,
      isShared: false,
      isActive: true,
      documentCount: 2,
    });
    expect(readAccess.requireView).toHaveBeenCalledWith(workspaceKnowledgeBase);
  });

  it('shows an organisation knowledge base as active and read-only by default', async () => {
    const knowledgeBase = new OrgKnowledgeBase({
      name: 'Dienstanweisungen',
      orgId: ORG_ID,
    });
    const { useCase } = await setup(knowledgeBase);

    await expect(useCase.execute(query(knowledgeBase.id))).resolves.toEqual({
      knowledgeBase,
      isShared: false,
      isActive: true,
      documentCount: 2,
      viewer: { canUse: true, canEdit: false },
      ownerDescription: {
        teamName: null,
        audienceCount: null,
        teamEditors: [],
        orgEditorsIncludeNonAdmins: false,
        submittedBy: null,
      },
    });
  });

  it('returns not found when owner-aware read authorization rejects the persisted resource', async () => {
    const inaccessible = new WorkspaceKnowledgeBase({
      name: 'Restricted project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: randomUUID(),
    });
    const { useCase, readAccess } = await setup(inaccessible);
    readAccess.requireView.mockRejectedValue(
      new KnowledgeBaseNotFoundError(inaccessible.id),
    );

    await expect(
      useCase.execute(query(inaccessible.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('returns not found when the entity does not exist', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, readAccess } = await setup(knowledgeBase);
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(query(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(readAccess.requireView).not.toHaveBeenCalled();
  });

  it('wraps unexpected read failures', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, readAccess } = await setup(knowledgeBase);
    readAccess.requireView.mockRejectedValue(new Error('Connection refused'));

    await expect(
      useCase.execute(query(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
