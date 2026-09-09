import { Test } from '@nestjs/testing';
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
    requireRead: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseReadAccessService>;
  const context = {
    get: jest.fn((key: string) => {
      if (key === 'userId') return USER_ID;
      if (key === 'orgId') return ORG_ID;
      return undefined;
    }),
  };
  const module = await Test.createTestingModule({
    providers: [
      FindKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseReadAccessService, useValue: readAccess },
      { provide: ContextService, useValue: context },
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
    });
    expect(readAccess.requireRead).toHaveBeenCalledWith(knowledgeBase);
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
    });
    expect(readAccess.requireRead).toHaveBeenCalledWith(sharedKnowledgeBase);
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
    expect(readAccess.requireRead).toHaveBeenCalledWith(workspaceKnowledgeBase);
  });

  it('returns not found when owner-aware read authorization rejects the persisted resource', async () => {
    const inaccessible = new WorkspaceKnowledgeBase({
      name: 'Restricted project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: randomUUID(),
    });
    const { useCase, readAccess } = await setup(inaccessible);
    readAccess.requireRead.mockRejectedValue(
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
    expect(readAccess.requireRead).not.toHaveBeenCalled();
  });

  it('wraps unexpected read failures', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit guidance',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, readAccess } = await setup(knowledgeBase);
    readAccess.requireRead.mockRejectedValue(new Error('Connection refused'));

    await expect(
      useCase.execute(query(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
