import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ParentChildIndexerRepository } from './parent-child-index.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';

describe('ParentChildIndexerRepository', () => {
  let repository: ParentChildIndexerRepository;

  beforeEach(async () => {
    const mockTypeOrmRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentChildIndexerRepository,
        {
          provide: getRepositoryToken(ParentChunkRecord),
          useValue: mockTypeOrmRepo,
        },
        ParentChildIndexerMapper,
      ],
    }).compile();

    repository = module.get(ParentChildIndexerRepository);
  });

  describe('findByDocumentIds', () => {
    it('should return empty array when queryVector is empty', async () => {
      const result = await repository.findByDocumentIds(
        [],
        [
          '11111111-1111-1111-1111-111111111111' as `${string}-${string}-${string}-${string}-${string}`,
        ],
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when documentIds is empty', async () => {
      const result = await repository.findByDocumentIds([0.1, 0.2, 0.3], []);

      expect(result).toEqual([]);
    });

    it('should return empty array for unsupported vector dimensions', async () => {
      const unsupportedVector = new Array(512).fill(0.1) as number[];
      const result = await repository.findByDocumentIds(unsupportedVector, [
        '11111111-1111-1111-1111-111111111111' as `${string}-${string}-${string}-${string}-${string}`,
      ]);

      expect(result).toEqual([]);
    });
  });
});
