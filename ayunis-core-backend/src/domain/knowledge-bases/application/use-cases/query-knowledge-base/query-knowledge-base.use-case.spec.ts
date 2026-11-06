import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { QueryKnowledgeBaseUseCase } from './query-knowledge-base.use-case';
import { QueryKnowledgeBaseQuery } from './query-knowledge-base.query';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { FindKnowledgeBaseForThreadUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base-for-thread/find-knowledge-base-for-thread.use-case';
import { FindContentChunksByIdsUseCase } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import type { UUID } from 'crypto';

describe('QueryKnowledgeBaseUseCase', () => {
  let useCase: QueryKnowledgeBaseUseCase;
  let mockKbRepo: jest.Mocked<KnowledgeBaseRepository>;
  let mockFindChunks: jest.Mocked<FindContentChunksByIdsUseCase>;
  let mockSearchContent: jest.Mocked<SearchContentUseCase>;
  let mockContextService: Partial<ContextService>;
  let mockFindKnowledgeBaseForThread: jest.Mocked<FindKnowledgeBaseForThreadUseCase>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const kbId = '33333333-3333-3333-3333-333333333333' as UUID;
  const sourceId = '44444444-4444-4444-4444-444444444444' as UUID;
  const chunkId = '55555555-5555-5555-5555-555555555555' as UUID;

  beforeEach(async () => {
    mockKbRepo = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findAllOwnedByUserId: jest.fn(),
      findAllByWorkspaceId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourcesByKnowledgeBaseIds: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseIds: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      isActive: jest.fn(),
      getActiveIds: jest.fn(),
      activateForWorkspace: jest.fn(),
      deactivateForWorkspace: jest.fn(),
      getWorkspaceStates: jest.fn(),
      findActiveAccessible: jest.fn(),
      findPaginatedAccessible: jest.fn(),
    };

    mockFindChunks = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindContentChunksByIdsUseCase>;

    mockSearchContent = {
      execute: jest.fn(),
      executeMulti: jest.fn(),
    } as unknown as jest.Mocked<SearchContentUseCase>;

    mockFindKnowledgeBaseForThread = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindKnowledgeBaseForThreadUseCase>;

    mockContextService = {
      get: jest.fn().mockReturnValue(orgId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockKbRepo },
        { provide: FindContentChunksByIdsUseCase, useValue: mockFindChunks },
        { provide: SearchContentUseCase, useValue: mockSearchContent },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: FindKnowledgeBaseForThreadUseCase,
          useValue: mockFindKnowledgeBaseForThread,
        },
      ],
    }).compile();

    useCase = module.get(QueryKnowledgeBaseUseCase);
  });

  it('should return matching chunks with source provenance', async () => {
    const kb = new PersonalKnowledgeBase({
      id: kbId,
      name: 'Stadtratsprotokolle',
      orgId,
      userId,
    });

    const chunk = new TextSourceContentChunk({
      id: chunkId,
      content: 'Die Grundsteuer beträgt 450% des Messbetrags.',
      meta: { startLine: 10, endLine: 15 },
    });

    const source = new FileSource({
      id: sourceId,
      name: 'Haushaltssatzung_2025.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
    });

    const indexMatch = new IndexMatch({
      entry: new IndexEntry({
        relatedDocumentId: sourceId,
        relatedChunkId: chunkId,
      }),
      matchedQueries: ['Grundsteuer'],
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([source]);
    mockSearchContent.executeMulti.mockResolvedValue([indexMatch]);
    mockFindChunks.execute.mockResolvedValue([
      {
        chunk,
        sourceId,
        sourceName: 'Haushaltssatzung_2025.pdf',
        sourceCreatedBy: SourceCreator.USER,
      },
    ]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toHaveLength(1);
    expect(results[0].chunk).toBe(chunk);
    expect(results[0].sourceName).toBe('Haushaltssatzung_2025.pdf');
    expect(results[0].sourceId).toBe(sourceId);
    expect(results[0].matchedQueries).toEqual(['Grundsteuer']);
    expect(mockSearchContent.executeMulti).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        documentIds: [sourceId],
        queries: ['Grundsteuer'],
      }),
    );
    expect(mockFindChunks.execute).toHaveBeenCalledWith(
      expect.objectContaining({ chunkIds: [chunkId] }),
    );
  });

  it('should fetch chunks by ID instead of loading full sources', async () => {
    const kb = new PersonalKnowledgeBase({
      id: kbId,
      name: 'Stadtratsprotokolle',
      orgId,
      userId,
    });

    const chunk = new TextSourceContentChunk({
      id: chunkId,
      content: 'Bebauungsplan Nr. 42 für das Gewerbegebiet Nord.',
      meta: { startLine: 1, endLine: 5 },
    });

    const source = new FileSource({
      id: sourceId,
      name: 'Bebauungsplan_42.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
    });

    const indexMatch = new IndexMatch({
      entry: new IndexEntry({
        relatedDocumentId: sourceId,
        relatedChunkId: chunkId,
      }),
      matchedQueries: ['Grundsteuer'],
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([source]);
    mockSearchContent.executeMulti.mockResolvedValue([indexMatch]);
    mockFindChunks.execute.mockResolvedValue([
      {
        chunk,
        sourceId,
        sourceName: 'Bebauungsplan_42.pdf',
        sourceCreatedBy: SourceCreator.USER,
      },
    ]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Bebauungsplan'],
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toHaveLength(1);
    expect(results[0].sourceName).toBe('Bebauungsplan_42.pdf');
  });

  it('should return empty results when knowledge base has no documents', async () => {
    const kb = new PersonalKnowledgeBase({
      id: kbId,
      name: 'Leere Wissenssammlung',
      orgId,
      userId,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toEqual([]);
    expect(mockSearchContent.executeMulti).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not exist', async () => {
    mockFindKnowledgeBaseForThread.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(kbId),
    );

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should throw KnowledgeBaseNotFoundError when KB is not owned or shared', async () => {
    mockFindKnowledgeBaseForThread.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(kbId),
    );

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should allow querying a shared knowledge base', async () => {
    const otherUserId = '66666666-6666-6666-6666-666666666666' as UUID;
    const sharedKb = new PersonalKnowledgeBase({
      id: kbId,
      name: 'Geteilte Wissenssammlung',
      orgId,
      userId: otherUserId,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(sharedKb);
    mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toEqual([]);
    expect(mockFindKnowledgeBaseForThread.execute).toHaveBeenCalledWith({
      knowledgeBaseId: kbId,
      threadId: undefined,
    });
  });

  it('should throw KnowledgeBaseNotFoundError when KB belongs to another org', async () => {
    const otherOrgId = '77777777-7777-7777-7777-777777777777' as UUID;
    const kb = new PersonalKnowledgeBase({
      id: kbId,
      name: 'Fremde Organisation Wissenssammlung',
      orgId: otherOrgId,
      userId,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(kb);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should skip index entries where chunk is not found in DB', async () => {
    const kb = new PersonalKnowledgeBase({
      id: kbId,
      name: 'Stadtratsprotokolle',
      orgId,
      userId,
    });

    const source = new FileSource({
      id: sourceId,
      name: 'Protokoll.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
    });

    const indexMatch = new IndexMatch({
      entry: new IndexEntry({
        relatedDocumentId: sourceId,
        relatedChunkId: chunkId,
      }),
      matchedQueries: ['Grundsteuer'],
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([source]);
    mockSearchContent.executeMulti.mockResolvedValue([indexMatch]);
    // Chunk not found in DB
    mockFindChunks.execute.mockResolvedValue([]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toEqual([]);
  });

  describe('with several knowledge bases', () => {
    const secondKbId = '88888888-8888-8888-8888-888888888888' as UUID;
    const secondSourceId = '99999999-9999-9999-9999-999999999999' as UUID;

    function knowledgeBase(id: UUID, name: string): PersonalKnowledgeBase {
      return new PersonalKnowledgeBase({ id, name, orgId, userId });
    }

    function fileSource(id: UUID, name: string): FileSource {
      return new FileSource({
        id,
        name,
        fileType: FileType.PDF,
        type: TextType.FILE,
      });
    }

    it('should search the documents of every knowledge base with every query in one search', async () => {
      mockFindKnowledgeBaseForThread.execute.mockImplementation(
        ({ knowledgeBaseId }) =>
          Promise.resolve(knowledgeBase(knowledgeBaseId, 'Satzungen')),
      );
      mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([
        fileSource(sourceId, 'Hundesteuersatzung.pdf'),
        fileSource(secondSourceId, 'Grundsteuersatzung.pdf'),
      ]);
      mockSearchContent.executeMulti.mockResolvedValue([]);

      await useCase.execute(
        new QueryKnowledgeBaseQuery({
          knowledgeBaseIds: [kbId, secondKbId],
          queries: ['Hebesatz', 'Steuerbefreiung'],
          userId,
        }),
      );

      expect(mockKbRepo.findSourcesByKnowledgeBaseIds).toHaveBeenCalledWith([
        kbId,
        secondKbId,
      ]);
      expect(mockSearchContent.executeMulti).toHaveBeenCalledTimes(1);
      expect(mockSearchContent.executeMulti).toHaveBeenCalledWith(
        expect.objectContaining({
          documentIds: [sourceId, secondSourceId],
          queries: ['Hebesatz', 'Steuerbefreiung'],
          limit: 10,
        }),
      );
    });

    it('should check access to every requested knowledge base for the thread', async () => {
      const threadId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID;
      mockFindKnowledgeBaseForThread.execute.mockImplementation(
        ({ knowledgeBaseId }) =>
          Promise.resolve(knowledgeBase(knowledgeBaseId, 'Satzungen')),
      );
      mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([]);

      await useCase.execute(
        new QueryKnowledgeBaseQuery({
          knowledgeBaseIds: [kbId, secondKbId],
          queries: ['Hebesatz'],
          userId,
          threadId,
        }),
      );

      expect(mockFindKnowledgeBaseForThread.execute).toHaveBeenCalledWith({
        knowledgeBaseId: kbId,
        threadId,
      });
      expect(mockFindKnowledgeBaseForThread.execute).toHaveBeenCalledWith({
        knowledgeBaseId: secondKbId,
        threadId,
      });
    });

    it('should reject the whole query without searching when one knowledge base is not accessible', async () => {
      mockFindKnowledgeBaseForThread.execute.mockImplementation(
        ({ knowledgeBaseId }) =>
          knowledgeBaseId === secondKbId
            ? Promise.reject(new KnowledgeBaseNotFoundError(secondKbId))
            : Promise.resolve(knowledgeBase(knowledgeBaseId, 'Satzungen')),
      );

      await expect(
        useCase.execute(
          new QueryKnowledgeBaseQuery({
            knowledgeBaseIds: [kbId, secondKbId],
            queries: ['Hebesatz'],
            userId,
          }),
        ),
      ).rejects.toThrow(new KnowledgeBaseNotFoundError(secondKbId));
      expect(mockKbRepo.findSourcesByKnowledgeBaseIds).not.toHaveBeenCalled();
      expect(mockSearchContent.executeMulti).not.toHaveBeenCalled();
    });

    it('should return at most twenty results across all queries', async () => {
      mockFindKnowledgeBaseForThread.execute.mockResolvedValue(
        knowledgeBase(kbId, 'Satzungen'),
      );
      mockKbRepo.findSourcesByKnowledgeBaseIds.mockResolvedValue([
        fileSource(sourceId, 'Hundesteuersatzung.pdf'),
      ]);
      const chunkIds = Array.from(
        { length: 25 },
        (_, index) =>
          `bbbbbbbb-bbbb-bbbb-bbbb-${String(index).padStart(12, '0')}` as UUID,
      );
      mockSearchContent.executeMulti.mockResolvedValue(
        chunkIds.map(
          (id) =>
            new IndexMatch({
              entry: new IndexEntry({
                relatedDocumentId: sourceId,
                relatedChunkId: id,
              }),
              matchedQueries: ['Hebesatz'],
            }),
        ),
      );
      mockFindChunks.execute.mockImplementation(({ chunkIds: ids }) =>
        Promise.resolve(
          ids.map((id) => ({
            chunk: new TextSourceContentChunk({
              id,
              content: 'Der Hebesatz beträgt 400 Prozent.',
              meta: {},
            }),
            sourceId,
            sourceName: 'Hundesteuersatzung.pdf',
            sourceCreatedBy: SourceCreator.USER,
          })),
        ),
      );

      const results = await useCase.execute(
        new QueryKnowledgeBaseQuery({
          knowledgeBaseIds: [kbId],
          queries: ['Hebesatz'],
          userId,
        }),
      );

      expect(results).toHaveLength(20);
    });
  });

  it('should wrap unexpected errors in UnexpectedKnowledgeBaseError', async () => {
    mockFindKnowledgeBaseForThread.execute.mockRejectedValue(
      new Error('database connection lost'),
    );

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseIds: [kbId],
      queries: ['Grundsteuer'],
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      UnexpectedKnowledgeBaseError,
    );
  });
});
