import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { QueryKnowledgeBaseUseCase } from './query-knowledge-base.use-case';
import { QueryKnowledgeBaseQuery } from './query-knowledge-base.query';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';

describe('QueryKnowledgeBaseUseCase', () => {
  let useCase: QueryKnowledgeBaseUseCase;
  let mockKbRepo: jest.Mocked<KnowledgeBaseRepository>;
  let mockSearchContent: jest.Mocked<SearchContentUseCase>;
  let mockContextService: Partial<ContextService>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const kbId = '33333333-3333-3333-3333-333333333333' as UUID;
  const sourceId = '44444444-4444-4444-4444-444444444444' as UUID;
  const chunkId = '55555555-5555-5555-5555-555555555555' as UUID;

  beforeEach(async () => {
    mockKbRepo = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    mockSearchContent = {
      execute: jest.fn(),
      executeMulti: jest.fn(),
    } as unknown as jest.Mocked<SearchContentUseCase>;

    mockContextService = {
      get: jest.fn().mockReturnValue(orgId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockKbRepo },
        { provide: SearchContentUseCase, useValue: mockSearchContent },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(QueryKnowledgeBaseUseCase);
  });

  it('should return matching chunks with source provenance', async () => {
    const kb = new KnowledgeBase({
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
      text: 'full text...',
      contentChunks: [chunk],
    });

    const indexEntry = new IndexEntry({
      relatedDocumentId: sourceId,
      relatedChunkId: chunkId,
    });

    mockKbRepo.findById.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseId.mockResolvedValue([source]);
    mockSearchContent.executeMulti.mockResolvedValue([indexEntry]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toHaveLength(1);
    expect(results[0].chunk).toBe(chunk);
    expect(results[0].sourceName).toBe('Haushaltssatzung_2025.pdf');
    expect(results[0].sourceId).toBe(sourceId);
    expect(mockSearchContent.executeMulti).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        documentIds: [sourceId],
        query: 'Grundsteuer',
      }),
    );
  });

  it('should look up sources from pre-loaded map instead of fetching individually', async () => {
    const kb = new KnowledgeBase({
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
      text: 'full text...',
      contentChunks: [chunk],
    });

    const indexEntry = new IndexEntry({
      relatedDocumentId: sourceId,
      relatedChunkId: chunkId,
    });

    mockKbRepo.findById.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseId.mockResolvedValue([source]);
    mockSearchContent.executeMulti.mockResolvedValue([indexEntry]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Bebauungsplan',
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toHaveLength(1);
    expect(results[0].sourceName).toBe('Bebauungsplan_42.pdf');
  });

  it('should return empty results when knowledge base has no documents', async () => {
    const kb = new KnowledgeBase({
      id: kbId,
      name: 'Leere Wissenssammlung',
      orgId,
      userId,
    });

    mockKbRepo.findById.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseId.mockResolvedValue([]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toEqual([]);
    expect(mockSearchContent.executeMulti).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not exist', async () => {
    mockKbRepo.findById.mockResolvedValue(null);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should throw KnowledgeBaseNotFoundError when KB belongs to another user', async () => {
    const otherUserId = '66666666-6666-6666-6666-666666666666' as UUID;
    const kb = new KnowledgeBase({
      id: kbId,
      name: 'Fremde Wissenssammlung',
      orgId,
      userId: otherUserId,
    });

    mockKbRepo.findById.mockResolvedValue(kb);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should throw KnowledgeBaseNotFoundError when KB belongs to another org', async () => {
    const otherOrgId = '77777777-7777-7777-7777-777777777777' as UUID;
    const kb = new KnowledgeBase({
      id: kbId,
      name: 'Fremde Organisation Wissenssammlung',
      orgId: otherOrgId,
      userId,
    });

    mockKbRepo.findById.mockResolvedValue(kb);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should skip index entries where source content chunk is not found', async () => {
    const kb = new KnowledgeBase({
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
      text: 'text...',
      contentChunks: [],
    });

    const indexEntry = new IndexEntry({
      relatedDocumentId: sourceId,
      relatedChunkId: chunkId,
    });

    mockKbRepo.findById.mockResolvedValue(kb);
    mockKbRepo.findSourcesByKnowledgeBaseId.mockResolvedValue([source]);
    mockSearchContent.executeMulti.mockResolvedValue([indexEntry]);

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    const results = await useCase.execute(query);

    expect(results).toEqual([]);
  });

  it('should wrap unexpected errors in UnexpectedKnowledgeBaseError', async () => {
    mockKbRepo.findById.mockRejectedValue(
      new Error('database connection lost'),
    );

    const query = new QueryKnowledgeBaseQuery({
      knowledgeBaseId: kbId,
      query: 'Grundsteuer',
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      UnexpectedKnowledgeBaseError,
    );
  });
});
