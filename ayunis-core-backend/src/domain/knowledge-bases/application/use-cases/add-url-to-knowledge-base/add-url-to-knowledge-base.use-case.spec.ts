import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { StartUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.use-case';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';
import { AddUrlToKnowledgeBaseUseCase } from './add-url-to-knowledge-base.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

function command(knowledgeBaseId: UUID): AddUrlToKnowledgeBaseCommand {
  return new AddUrlToKnowledgeBaseCommand({
    knowledgeBaseId,
    url: 'https://stadt.example/permit-guidance',
    maxDepth: 1,
  });
}

async function setup(knowledgeBase: KnowledgeBase) {
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    countSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue(0),
    assignSourceToKnowledgeBase: jest.fn(),
  };
  const writeAccess = {
    requireWrite: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseWriteAccessService>;
  const source = new UrlSource({
    url: 'https://stadt.example/permit-guidance',
    name: 'Permit guidance',
    type: TextType.WEB,
  });
  const crawl = { execute: jest.fn().mockResolvedValue(source) };
  const txHost = {
    withTransaction: jest.fn(async (callback: () => Promise<unknown>) =>
      callback(),
    ),
  } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
  const module = await Test.createTestingModule({
    providers: [
      AddUrlToKnowledgeBaseUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: StartUrlCrawlUseCase, useValue: crawl },
      { provide: TransactionHost, useValue: txHost },
    ],
  }).compile();
  return {
    useCase: module.get(AddUrlToKnowledgeBaseUseCase),
    repository,
    writeAccess,
    crawl,
    source,
  };
}

describe(AddUrlToKnowledgeBaseUseCase.name, () => {
  it.each([
    [
      'personal',
      () =>
        new PersonalKnowledgeBase({
          name: 'Permit guidance',
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
    'adds a URL to an authorized %s knowledge base by entity id',
    async (_scope, makeKnowledgeBase) => {
      const knowledgeBase = makeKnowledgeBase();
      const { useCase, repository, source } = await setup(knowledgeBase);

      await expect(useCase.execute(command(knowledgeBase.id))).resolves.toBe(
        source,
      );
      expect(repository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
        source.id,
        knowledgeBase.id,
      );
    },
  );

  it.each([
    [
      'unrelated owner',
      new PersonalKnowledgeBase({
        name: 'Shared regulations',
        userId: randomUUID(),
        orgId: ORG_ID,
      }),
    ],
    [
      'cross-organization owner',
      new WorkspaceKnowledgeBase({
        name: 'Foreign project regulations',
        workspaceId: WORKSPACE_ID,
        orgId: randomUUID(),
      }),
    ],
  ])('does not start a crawl for an %s', async (_scenario, knowledgeBase) => {
    const { useCase, writeAccess, crawl, repository } =
      await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(writeAccess.requireWrite).toHaveBeenCalledWith(knowledgeBase);
    expect(crawl.execute).not.toHaveBeenCalled();
    expect(repository.assignSourceToKnowledgeBase).not.toHaveBeenCalled();
  });

  it('does not crawl when the persisted knowledge base is at capacity', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, crawl } = await setup(knowledgeBase);
    repository.countSourcesByKnowledgeBaseId.mockResolvedValue(
      KnowledgeBasesConstants.MAX_SOURCES,
    );

    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(KnowledgeBaseSourceLimitExceededError);
    expect(crawl.execute).not.toHaveBeenCalled();
  });

  it('wraps unexpected lookup failures', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      name: 'Permit regulations',
      userId: USER_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository } = await setup(knowledgeBase);
    repository.findById.mockRejectedValue(new Error('Connection refused'));

    await expect(
      useCase.execute(command(knowledgeBase.id)),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
