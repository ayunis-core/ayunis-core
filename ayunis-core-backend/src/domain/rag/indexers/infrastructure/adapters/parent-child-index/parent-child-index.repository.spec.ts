import { TransactionHost } from '@nestjs-cls/transactional';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ParentChildIndexerRepository } from './parent-child-index.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';

describe('ParentChildIndexerRepository', () => {
  let repository: ParentChildIndexerRepository;
  let createQueryBuilder: jest.Mock;

  beforeEach(async () => {
    createQueryBuilder = jest.fn();
    const mockTypeOrmRepo = {
      createQueryBuilder,
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: TransactionHost, useValue: { tx: undefined } },
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
        ['11111111-1111-1111-1111-111111111111'],
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
        '11111111-1111-1111-1111-111111111111',
      ]);

      expect(result).toEqual([]);
    });

    it('scores each parent chunk by its closest child chunk', async () => {
      const parentId = '22222222-2222-2222-2222-222222222222';
      const parentRecord = Object.assign(new ParentChunkRecord(), {
        id: parentId,
        relatedDocumentId: '11111111-1111-1111-1111-111111111111',
        relatedChunkId: '33333333-3333-3333-3333-333333333333',
        content: 'Die Kündigungsfrist beträgt drei Monate.',
        children: [],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [parentRecord],
          raw: [
            { parentChunk_id: parentId, distance: '0.125' },
            { parentChunk_id: parentId, distance: '0.5' },
          ],
        }),
      };
      createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await repository.findByDocumentIds(
        new Array(1024).fill(0.1) as number[],
        ['11111111-1111-1111-1111-111111111111'],
      );

      expect(result).toHaveLength(1);
      expect(result[0].parentChunk.id).toBe(parentId);
      expect(result[0].distance).toBe(0.125);
    });
  });
});
