import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { ParentChildIndexerRepository } from './parent-child-index.repository';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';

const DOC_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function managerFor(repository: object) {
  return {
    getRepository: jest.fn((target: unknown) => {
      if (target !== ParentChunkRecord) throw new Error('unexpected record');
      return repository;
    }),
  } as unknown as EntityManager;
}

function deletingRepository() {
  const qb = {
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  return { qb, repository: { createQueryBuilder: jest.fn(() => qb) } };
}

describe('ParentChildIndexerRepository', () => {
  let repository: ParentChildIndexerRepository;

  beforeEach(() => {
    repository = new ParentChildIndexerRepository(
      {} as Repository<ParentChunkRecord>,
      new ParentChildIndexerMapper(),
      { tx: managerFor({}) } as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  });

  it('writes through the ambient transaction manager', async () => {
    const defaultWrites = deletingRepository();
    const txWrites = deletingRepository();
    repository = new ParentChildIndexerRepository(
      defaultWrites.repository as unknown as Repository<ParentChunkRecord>,
      new ParentChildIndexerMapper(),
      {
        tx: managerFor(txWrites.repository),
      } as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await repository.delete(DOC_ID);

    expect(txWrites.qb.execute).toHaveBeenCalledTimes(1);
    expect(defaultWrites.qb.execute).not.toHaveBeenCalled();
  });

  it('falls back to the default repository without a CLS context', async () => {
    const defaultWrites = deletingRepository();
    const defaultRepository = {
      ...defaultWrites.repository,
      manager: managerFor(defaultWrites.repository),
    };
    repository = new ParentChildIndexerRepository(
      defaultRepository as unknown as Repository<ParentChunkRecord>,
      new ParentChildIndexerMapper(),
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await repository.delete(DOC_ID);

    expect(defaultWrites.qb.execute).toHaveBeenCalledTimes(1);
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
  });
});
