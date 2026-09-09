import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { GetSourcesByKnowledgeBaseIdUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.use-case';
import { DeleteKnowledgeBaseCommand } from './delete-knowledge-base.command';
import { DeleteKnowledgeBaseUseCase } from './delete-knowledge-base.use-case';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

function command(knowledgeBaseId: UUID): DeleteKnowledgeBaseCommand {
  return new DeleteKnowledgeBaseCommand({ knowledgeBaseId });
}

async function setup(knowledgeBase: KnowledgeBase) {
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    delete: jest.fn(),
  };
  const writeAccess = {
    requireWrite: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseWriteAccessService>;
  const getSources = { execute: jest.fn().mockResolvedValue([]) };
  const deleteSources = { execute: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      DeleteKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: GetSourcesByKnowledgeBaseIdUseCase, useValue: getSources },
      { provide: DeleteSourcesUseCase, useValue: deleteSources },
    ],
  }).compile();
  return {
    useCase: module.get(DeleteKnowledgeBaseUseCase),
    repository,
    writeAccess,
    getSources,
    deleteSources,
  };
}

describe(DeleteKnowledgeBaseUseCase.name, () => {
  it.each([
    [
      'personal',
      () =>
        new PersonalKnowledgeBase({
          name: 'Permit regulations',
          userId: USER_ID,
          orgId: ORG_ID,
        }),
    ],
    [
      'workspace',
      () =>
        new WorkspaceKnowledgeBase({
          name: 'Project regulations',
          workspaceId: WORKSPACE_ID,
          orgId: ORG_ID,
        }),
    ],
  ])(
    'deletes an authorized %s knowledge base by entity id',
    async (_scope, makeKnowledgeBase) => {
      const existing = makeKnowledgeBase();
      const { useCase, repository, deleteSources } = await setup(existing);

      await expect(
        useCase.execute(command(existing.id)),
      ).resolves.toBeUndefined();

      expect(deleteSources.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: existing.orgId, sourceIds: [] }),
      );
      expect(repository.delete).toHaveBeenCalledWith(existing);
    },
  );

  it.each([
    [
      'an unrelated owner',
      new PersonalKnowledgeBase({
        name: 'Shared regulations',
        userId: randomUUID(),
        orgId: ORG_ID,
      }),
    ],
    [
      'another organization',
      new WorkspaceKnowledgeBase({
        name: 'Foreign project regulations',
        workspaceId: WORKSPACE_ID,
        orgId: randomUUID(),
      }),
    ],
  ])('does not delete for %s', async (_scenario, existing) => {
    const { useCase, repository, writeAccess, getSources, deleteSources } =
      await setup(existing);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(existing.id),
    );

    await expect(useCase.execute(command(existing.id))).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(getSources.execute).not.toHaveBeenCalled();
    expect(deleteSources.execute).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('returns not found without source cleanup when the entity does not exist', async () => {
    const existing = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess, getSources, deleteSources } =
      await setup(existing);
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute(command(existing.id))).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(writeAccess.requireWrite).not.toHaveBeenCalled();
    expect(getSources.execute).not.toHaveBeenCalled();
    expect(deleteSources.execute).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('wraps unexpected lookup failures', async () => {
    const existing = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository } = await setup(existing);
    repository.findById.mockRejectedValue(new Error('Connection refused'));

    await expect(useCase.execute(command(existing.id))).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
  });
});
