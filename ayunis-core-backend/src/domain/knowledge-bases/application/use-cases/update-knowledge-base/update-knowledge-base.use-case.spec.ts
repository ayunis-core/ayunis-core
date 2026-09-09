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
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';
import { UpdateKnowledgeBaseUseCase } from './update-knowledge-base.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

function command(knowledgeBaseId: UUID): UpdateKnowledgeBaseCommand {
  return new UpdateKnowledgeBaseCommand({
    knowledgeBaseId,
    name: 'Updated permit regulations',
    description: 'Updated municipal permit guidance.',
  });
}

async function setup(knowledgeBase: KnowledgeBase) {
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    save: jest.fn(async (saved) => saved),
  };
  const writeAccess = {
    requireWrite: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseWriteAccessService>;
  const module = await Test.createTestingModule({
    providers: [
      UpdateKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
    ],
  }).compile();
  return {
    useCase: module.get(UpdateKnowledgeBaseUseCase),
    repository,
    writeAccess,
  };
}

describe(UpdateKnowledgeBaseUseCase.name, () => {
  it('updates a personal knowledge base while preserving its concrete owner', async () => {
    const existing = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      description: 'Original guidance.',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase } = await setup(existing);

    const result = await useCase.execute(command(existing.id));

    expect(result).toBeInstanceOf(PersonalKnowledgeBase);
    expect(result).toMatchObject({
      id: existing.id,
      userId: USER_ID,
      name: 'Updated permit regulations',
      description: 'Updated municipal permit guidance.',
    });
  });

  it('updates a workspace knowledge base while preserving its persisted workspace owner', async () => {
    const existing = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      description: 'Original project guidance.',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase } = await setup(existing);

    const result = await useCase.execute(command(existing.id));

    expect(result).toBeInstanceOf(WorkspaceKnowledgeBase);
    expect(result).toMatchObject({
      id: existing.id,
      workspaceId: WORKSPACE_ID,
      name: 'Updated permit regulations',
    });
  });

  it.each([
    [
      'an unrelated personal owner',
      () =>
        new PersonalKnowledgeBase({
          name: 'Shared regulations',
          userId: randomUUID(),
          orgId: ORG_ID,
        }),
    ],
    [
      'another organization',
      () =>
        new WorkspaceKnowledgeBase({
          name: 'Foreign project regulations',
          workspaceId: WORKSPACE_ID,
          orgId: randomUUID(),
        }),
    ],
  ])('does not mutate for %s', async (_scenario, makeKnowledgeBase) => {
    const existing = makeKnowledgeBase();
    const { useCase, repository, writeAccess } = await setup(existing);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(existing.id),
    );

    await expect(useCase.execute(command(existing.id))).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(writeAccess.requireWrite).toHaveBeenCalledWith(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('leaves omitted fields unchanged without changing ownership', async () => {
    const existing = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      description: 'Original project guidance.',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase } = await setup(existing);
    const input = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId: existing.id,
      name: 'Updated project regulations',
    });

    const result = await useCase.execute(input);

    expect(result).toMatchObject({
      workspaceId: WORKSPACE_ID,
      name: 'Updated project regulations',
      description: 'Original project guidance.',
    });
  });

  it('returns not found without saving when the entity does not exist', async () => {
    const existing = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess } = await setup(existing);
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute(command(existing.id))).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(writeAccess.requireWrite).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('wraps unexpected persistence failures', async () => {
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
