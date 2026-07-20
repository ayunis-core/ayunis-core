import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { AddUrlToKnowledgeBaseUseCase } from './add-url-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { StartUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.use-case';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

describe('AddUrlToKnowledgeBaseUseCase', () => {
  let useCase: AddUrlToKnowledgeBaseUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockStartUrlCrawlUseCase: jest.Mocked<StartUrlCrawlUseCase>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

  // Runs the transactional callback inline.
  const txHost = {
    withTransaction: jest.fn((fn: () => Promise<unknown>) => fn()),
  };

  function ownedKnowledgeBase(): KnowledgeBase {
    return new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
  }

  function processingUrlSource(): UrlSource {
    return new UrlSource({
      url: 'https://example.com/stadtrat',
      name: 'example.com',
      type: TextType.WEB,
      maxDepth: 2,
      status: SourceStatus.PROCESSING,
    });
  }

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue(0),
    };

    mockStartUrlCrawlUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartUrlCrawlUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddUrlToKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
        { provide: StartUrlCrawlUseCase, useValue: mockStartUrlCrawlUseCase },
        { provide: TransactionHost, useValue: txHost },
      ],
    }).compile();

    useCase = module.get(AddUrlToKnowledgeBaseUseCase);
  });

  it('starts an async crawl with the requested depth and assigns the source', async () => {
    mockRepository.findById.mockResolvedValue(ownedKnowledgeBase());
    const source = processingUrlSource();
    mockStartUrlCrawlUseCase.execute.mockResolvedValue(source);

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
      maxDepth: 2,
    });

    const result = await useCase.execute(command);

    expect(result).toBe(source);
    expect(mockStartUrlCrawlUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/stadtrat',
        maxDepth: 2,
      }),
    );
    expect(mockRepository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
      source.id,
      knowledgeBaseId,
    );
  });

  it('throws KnowledgeBaseNotFoundError when the KB does not belong to the user', async () => {
    const otherUserId = '99999999-9999-9999-9999-999999999999' as UUID;
    mockRepository.findById.mockResolvedValue(
      new KnowledgeBase({
        id: knowledgeBaseId,
        name: 'Anderer Benutzer KB',
        orgId,
        userId: otherUserId,
      }),
    );

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(mockStartUrlCrawlUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws when the knowledge base is at its source limit', async () => {
    mockRepository.findById.mockResolvedValue(ownedKnowledgeBase());
    mockRepository.countSourcesByKnowledgeBaseId.mockResolvedValue(
      KnowledgeBasesConstants.MAX_SOURCES,
    );

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseSourceLimitExceededError,
    );
    expect(mockStartUrlCrawlUseCase.execute).not.toHaveBeenCalled();
  });

  it('wraps non-ApplicationErrors in UnexpectedKnowledgeBaseError', async () => {
    mockRepository.findById.mockResolvedValue(ownedKnowledgeBase());
    mockStartUrlCrawlUseCase.execute.mockRejectedValue(
      new Error('connection timeout'),
    );

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedKnowledgeBaseError,
    );
  });
});
