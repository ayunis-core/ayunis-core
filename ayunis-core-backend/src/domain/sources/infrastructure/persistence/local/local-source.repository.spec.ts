import { randomUUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { LocalSourceRepository } from './local-source.repository';
import { SourceRecord, TextSourceRecord } from './schema/source.record';
import type { DataSourceRecord } from './schema/source.record';
import { TextSourceDetailsRecord } from './schema/text-source-details.record';
import type { CSVDataSourceDetailsRecord } from './schema/data-source-details.record';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import type { SourceMapper } from './mappers/source.mapper';
import type { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

describe('LocalSourceRepository', () => {
  it('clears failure metadata in the same guarded update that makes a source ready', async () => {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValue({ createQueryBuilder: () => qb }),
    } as unknown as EntityManager;
    const repository = new LocalSourceRepository(
      {} as Repository<SourceRecord>,
      {} as SourceMapper,
      {} as SourceContentChunkMapper,
      { tx: manager } as TransactionHost<TransactionalAdapterTypeOrm>,
    );
    const id = randomUUID();
    await expect(
      repository.updateStatusConditionally(
        id,
        SourceStatus.PROCESSING,
        SourceStatus.READY,
      ),
    ).resolves.toBe(true);
    expect(qb.set).toHaveBeenCalledWith({
      status: SourceStatus.READY,
      processingError: null,
      processingErrorCode: null,
    });
    expect(qb.where).toHaveBeenCalledWith('id = :id AND status = :fromStatus', {
      id,
      fromStatus: SourceStatus.PROCESSING,
    });
  });

  it('uses the default repository outside an active transaction', async () => {
    const sourceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as Repository<SourceRecord>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(sourceRepository),
    } as unknown as EntityManager;
    Object.assign(sourceRepository, { manager });
    const repository = new LocalSourceRepository(
      sourceRepository,
      {} as SourceMapper,
      {} as SourceContentChunkMapper,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await expect(repository.findById(randomUUID())).resolves.toBeNull();
    expect(sourceRepository.findOne).toHaveBeenCalledTimes(1);
  });

  it('keeps earlier sheet writes in the transaction when a later save fails', async () => {
    const first = new CSVDataSource({
      name: 'Municipal fees.csv',
      data: { headers: ['Fee'], rows: [['Waste collection']] },
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date('2026-08-27T10:00:00Z'),
    });
    const second = new CSVDataSource({
      name: 'Municipal products.csv',
      data: { headers: ['Product'], rows: [['Passport']] },
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date('2026-08-27T10:00:00Z'),
    });
    const firstRecord = { id: first.id } as DataSourceRecord;
    const secondRecord = { id: second.id } as DataSourceRecord;
    const detailsRecord = {
      source: firstRecord,
    } as CSVDataSourceDetailsRecord;
    const saveInTransaction = jest
      .fn()
      .mockResolvedValueOnce(firstRecord)
      .mockRejectedValueOnce(new Error('second sheet save failed'));
    const transactionalSourceRepository = { save: saveInTransaction };
    const transactionalDetailsRepository = {
      save: jest.fn().mockResolvedValue(detailsRecord),
    };
    const manager = {
      getRepository: jest.fn((target: unknown) =>
        target === SourceRecord
          ? transactionalSourceRepository
          : transactionalDetailsRepository,
      ),
    } as unknown as EntityManager;
    const mapper = {
      toRecord: jest
        .fn()
        .mockReturnValueOnce({ source: firstRecord, details: detailsRecord })
        .mockReturnValueOnce({ source: secondRecord, details: detailsRecord }),
      toDomain: jest.fn().mockReturnValue(first),
    } as unknown as SourceMapper;
    const txHost = {
      tx: manager,
    } as TransactionHost<TransactionalAdapterTypeOrm>;
    const repository = new LocalSourceRepository(
      {} as Repository<SourceRecord>,
      mapper,
      {} as SourceContentChunkMapper,
      txHost,
    );

    await expect(repository.save(first)).resolves.toBe(first);
    await expect(repository.save(second)).rejects.toThrow(
      'second sheet save failed',
    );
    expect(saveInTransaction).toHaveBeenCalledTimes(2);
  });

  it('replaces text source rows through the ambient transaction, locking the source and dropping the previous details first', async () => {
    const source = new FileSource({
      name: 'Waste policy.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
      status: SourceStatus.READY,
    });
    const lockedRecord = Object.assign(new TextSourceRecord(), {
      id: source.id,
    });
    const detailsRecord = {} as TextSourceDetailsRecord;
    const chunks = [{ id: randomUUID() }] as SourceContentChunkRecord[];
    const writes: string[] = [];
    const deleteDetails = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => {
        writes.push('delete details');
        return { affected: 1 };
      }),
    };
    const txSourceRepository = {
      findOne: jest.fn(async () => {
        writes.push('lock source');
        return lockedRecord;
      }),
      update: jest.fn(async () => {
        writes.push('update source run columns');
        return { affected: 1 };
      }),
      save: jest.fn(),
    };
    const txDetailsRepository = {
      createQueryBuilder: jest.fn(() => deleteDetails),
      save: jest.fn(async () => {
        writes.push('save details');
        return detailsRecord;
      }),
    };
    const txChunkRepository = {
      save: jest.fn(async () => {
        writes.push('save chunks');
        return chunks;
      }),
    };
    const manager = {
      getRepository: jest.fn((target: unknown) => {
        if (target === SourceRecord) return txSourceRepository;
        if (target === TextSourceDetailsRecord) return txDetailsRepository;
        return txChunkRepository;
      }),
    } as unknown as EntityManager;
    const mapper = {
      toTextSourceRecord: jest.fn().mockReturnValue({
        source: {},
        details: detailsRecord,
        contentChunks: chunks,
      }),
      toDomain: jest.fn().mockReturnValue(source),
    } as unknown as SourceMapper;
    const repository = new LocalSourceRepository(
      {} as Repository<SourceRecord>,
      mapper,
      {} as SourceContentChunkMapper,
      { tx: manager } as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await expect(
      repository.replaceTextSource(source, { text: 'Policy', chunks: [] }),
    ).resolves.toBe(source);
    expect(deleteDetails.where).toHaveBeenCalledWith('"sourceId" = :sourceId', {
      sourceId: source.id,
    });
    expect(txSourceRepository.findOne).toHaveBeenCalledWith({
      where: { id: source.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(writes).toEqual([
      'lock source',
      'delete details',
      'update source run columns',
      'save details',
      'save chunks',
    ]);
    expect(txSourceRepository.save).not.toHaveBeenCalled();
    expect(txChunkRepository.save).toHaveBeenCalledWith(chunks);
  });

  it('writes nothing and returns null when the locked source row is gone', async () => {
    const source = new FileSource({
      name: 'Waste policy.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
    });
    const txSourceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      save: jest.fn(),
    };
    const txDetailsRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };
    const txChunkRepository = { save: jest.fn() };
    const manager = {
      getRepository: jest.fn((target: unknown) => {
        if (target === SourceRecord) return txSourceRepository;
        if (target === TextSourceDetailsRecord) return txDetailsRepository;
        return txChunkRepository;
      }),
    } as unknown as EntityManager;
    const mapper = {
      toTextSourceRecord: jest.fn().mockReturnValue({
        source: { id: source.id },
        details: {},
        contentChunks: [],
      }),
    } as unknown as SourceMapper;
    const repository = new LocalSourceRepository(
      {} as Repository<SourceRecord>,
      mapper,
      {} as SourceContentChunkMapper,
      { tx: manager } as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await expect(
      repository.replaceTextSource(source, { text: 'Policy', chunks: [] }),
    ).resolves.toBeNull();
    expect(txDetailsRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(txSourceRepository.update).not.toHaveBeenCalled();
    expect(txDetailsRepository.save).not.toHaveBeenCalled();
    expect(txChunkRepository.save).not.toHaveBeenCalled();
  });

  it('loads a citation chunk and source metadata without extracted full text', async () => {
    const chunkId = randomUUID();
    const sourceId = randomUUID();
    const chunk = new TextSourceContentChunk({
      id: chunkId,
      content: 'Council approved the mobility plan.',
      meta: { startLine: 21, endLine: 22 },
    });
    const record = {
      id: chunkId,
      content: chunk.content,
      meta: chunk.meta,
      source: {
        text: '# Mobility plan\n\nCouncil approved the mobility plan.',
        source: {
          id: sourceId,
          name: 'Mobility plan.pdf',
          createdBy: SourceCreator.USER,
          status: SourceStatus.READY,
          knowledgeBaseId: null,
          url: null,
        },
      },
    } as SourceContentChunkRecord;
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(record),
    };
    const chunkRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const manager = {
      getRepository: jest.fn((target: unknown) =>
        target === SourceContentChunkRecord ? chunkRepository : {},
      ),
    } as unknown as EntityManager;
    const chunkMapper = {
      toDomain: jest.fn().mockReturnValue(chunk),
    } as unknown as SourceContentChunkMapper;
    const repository = new LocalSourceRepository(
      {} as Repository<SourceRecord>,
      {} as SourceMapper,
      chunkMapper,
      { tx: manager } as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    await expect(repository.findCitationTarget(chunkId)).resolves.toEqual({
      chunk,
      source: {
        id: sourceId,
        name: 'Mobility plan.pdf',
        createdBy: SourceCreator.USER,
        status: SourceStatus.READY,
        knowledgeBaseId: null,
        url: null,
      },
    });
    expect(chunkRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(queryBuilder.select).toHaveBeenCalledWith(
      expect.not.arrayContaining(['details.text']),
    );
    expect(queryBuilder.getOne).toHaveBeenCalledTimes(1);
  });
});
