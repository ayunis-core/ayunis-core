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
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
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
function personalKnowledgeBase() {
  return new PersonalKnowledgeBase({
    name: 'Permit regulations',
    userId: USER_ID,
    orgId: ORG_ID,
  });
}
function command(knowledgeBaseId: UUID): DeleteKnowledgeBaseCommand {
  return new DeleteKnowledgeBaseCommand({ knowledgeBaseId });
}
async function setup(knowledgeBase: KnowledgeBase = personalKnowledgeBase()) {
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    delete: jest.fn(),
  };
  const writeAccess = { requireWrite: jest.fn() };
  const getSources = { execute: jest.fn().mockResolvedValue([]) };
  const cleanupProcessing = { execute: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      DeleteKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: GetSourcesByKnowledgeBaseIdUseCase, useValue: getSources },
      { provide: CleanupSourceProcessingUseCase, useValue: cleanupProcessing },
    ],
  }).compile();
  return {
    useCase: module.get(DeleteKnowledgeBaseUseCase),
    repository,
    writeAccess,
    getSources,
    cleanupProcessing,
    knowledgeBase,
  };
}

describe(DeleteKnowledgeBaseUseCase.name, () => {
  it.each([
    ['personal', personalKnowledgeBase],
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
      const { useCase, repository, cleanupProcessing, getSources } =
        await setup(existing);
      const sourceIds = [randomUUID(), randomUUID()];
      getSources.execute.mockResolvedValue(sourceIds.map((id) => ({ id })));
      await expect(
        useCase.execute(command(existing.id)),
      ).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(existing);
      expect(cleanupProcessing.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: existing.orgId, sourceIds }),
      );
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
    const { useCase, repository, writeAccess, getSources, cleanupProcessing } =
      await setup(existing);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(existing.id),
    );
    await expect(useCase.execute(command(existing.id))).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(getSources.execute).not.toHaveBeenCalled();
    expect(cleanupProcessing.execute).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('returns not found without cleanup when the entity does not exist', async () => {
    const {
      useCase,
      repository,
      writeAccess,
      getSources,
      cleanupProcessing,
      knowledgeBase,
    } = await setup();
    repository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(writeAccess.requireWrite).not.toHaveBeenCalled();
    expect(getSources.execute).not.toHaveBeenCalled();
    expect(cleanupProcessing.execute).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('does not perform irreversible cleanup if the database delete fails', async () => {
    const { useCase, repository, cleanupProcessing, knowledgeBase } =
      await setup();
    repository.delete.mockRejectedValue(new Error('delete failed'));
    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
    expect(cleanupProcessing.execute).not.toHaveBeenCalled();
  });

  it('deletes database records before external processing cleanup', async () => {
    const { useCase, repository, cleanupProcessing, knowledgeBase } =
      await setup();
    const events: string[] = [];
    repository.delete.mockImplementation(() => {
      events.push('database deletion');
      return Promise.resolve();
    });
    cleanupProcessing.execute.mockImplementation(() => {
      events.push('external cleanup');
      return Promise.resolve();
    });
    await useCase.execute(command(knowledgeBase.id));
    expect(events).toEqual(['database deletion', 'external cleanup']);
  });

  it('does not fail an already completed deletion when external cleanup fails', async () => {
    const { useCase, repository, cleanupProcessing, knowledgeBase } =
      await setup();
    cleanupProcessing.execute.mockRejectedValue(
      new Error('Storage unavailable'),
    );
    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(knowledgeBase);
  });

  it('deletes an empty collection', async () => {
    const { useCase, repository, knowledgeBase } = await setup();
    await useCase.execute(command(knowledgeBase.id));
    expect(repository.delete).toHaveBeenCalledWith(knowledgeBase);
  });

  it('wraps unexpected lookup failures', async () => {
    const { useCase, repository, knowledgeBase } = await setup();
    repository.findById.mockRejectedValue(new Error('Connection refused'));
    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
