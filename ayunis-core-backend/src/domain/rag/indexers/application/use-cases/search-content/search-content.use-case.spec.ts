import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SearchContentUseCase } from './search-content.use-case';
import { IndexRegistry } from '../../indexer.registry';
import { SearchMultiContentQuery } from './search-content.query';
import { IndexType } from '../../../domain/value-objects/index-type.enum';
import { IndexEntry } from '../../../domain/index-entry.entity';
import { UnexpectedIndexError } from '../../indexer.errors';
import type { IndexerPort } from '../../ports/indexer';
import type { UUID } from 'crypto';

describe('SearchContentUseCase', () => {
  let useCase: SearchContentUseCase;
  let mockRegistry: jest.Mocked<IndexRegistry>;
  let mockIndexer: jest.Mocked<IndexerPort>;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const docId1 = '22222222-2222-2222-2222-222222222222' as UUID;
  const docId2 = '33333333-3333-3333-3333-333333333333' as UUID;
  const chunkId = '44444444-4444-4444-4444-444444444444' as UUID;

  beforeEach(async () => {
    mockIndexer = {
      search: jest.fn(),
      searchMulti: jest.fn(),
      ingest: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as jest.Mocked<IndexerPort>;

    mockRegistry = {
      get: jest.fn().mockReturnValue(mockIndexer),
      register: jest.fn(),
      getAll: jest.fn(),
    } as unknown as jest.Mocked<IndexRegistry>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchContentUseCase,
        { provide: IndexRegistry, useValue: mockRegistry },
      ],
    }).compile();

    useCase = module.get(SearchContentUseCase);
  });

  describe('executeMulti', () => {
    it('should resolve index from registry and delegate to searchMulti', async () => {
      const entry = new IndexEntry({
        relatedDocumentId: docId1,
        relatedChunkId: chunkId,
      });
      mockIndexer.searchMulti.mockResolvedValue([entry]);

      const query = new SearchMultiContentQuery({
        orgId,
        query: 'Bebauungsplan Gewerbegebiet',
        documentIds: [docId1, docId2],
        type: IndexType.PARENT_CHILD,
        limit: 25,
      });

      const results = await useCase.executeMulti(query);

      expect(mockRegistry.get).toHaveBeenCalledWith(IndexType.PARENT_CHILD);
      expect(mockIndexer.searchMulti).toHaveBeenCalledWith({
        orgId,
        documentIds: [docId1, docId2],
        query: 'Bebauungsplan Gewerbegebiet',
        filter: { limit: 25 },
      });
      expect(results).toEqual([entry]);
    });

    it('should pass undefined limit when not specified in query', async () => {
      mockIndexer.searchMulti.mockResolvedValue([]);

      const query = new SearchMultiContentQuery({
        orgId,
        query: 'Haushaltssatzung',
        documentIds: [docId1],
        type: IndexType.PARENT_CHILD,
      });

      await useCase.executeMulti(query);

      expect(mockIndexer.searchMulti).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { limit: undefined },
        }),
      );
    });

    it('should wrap synchronous errors in UnexpectedIndexError', async () => {
      mockRegistry.get.mockImplementation(() => {
        throw new Error('Index type parent_child not found');
      });

      const query = new SearchMultiContentQuery({
        orgId,
        query: 'Wassergebühren',
        documentIds: [docId1],
        type: IndexType.PARENT_CHILD,
      });

      await expect(useCase.executeMulti(query)).rejects.toThrow(
        UnexpectedIndexError,
      );
    });

    it('should rethrow ApplicationError without wrapping', async () => {
      const appError = new UnexpectedIndexError(
        new Error('Bekannter Indexfehler'),
      );
      mockRegistry.get.mockImplementation(() => {
        throw appError;
      });

      const query = new SearchMultiContentQuery({
        orgId,
        query: 'Abfallgebühren',
        documentIds: [docId1],
        type: IndexType.PARENT_CHILD,
      });

      await expect(useCase.executeMulti(query)).rejects.toBe(appError);
    });
  });
});
