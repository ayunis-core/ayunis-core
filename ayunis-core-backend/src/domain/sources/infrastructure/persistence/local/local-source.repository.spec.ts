import { randomUUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { LocalSourceRepository } from './local-source.repository';
import { SourceRecord } from './schema/source.record';
import type {
  DataSourceRecord,
  TextSourceRecord,
} from './schema/source.record';
import { TextSourceDetailsRecord } from './schema/text-source-details.record';
import type { CSVDataSourceDetailsRecord } from './schema/data-source-details.record';
import type { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import type { SourceMapper } from './mappers/source.mapper';
import type { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

describe('LocalSourceRepository', () => {
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

  it('saves text source rows through the ambient transaction', async () => {
    const source = new FileSource({
      name: 'Waste policy.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
      status: SourceStatus.READY,
    });
    const sourceRecord = { id: source.id } as TextSourceRecord;
    const detailsRecord = { source: sourceRecord } as TextSourceDetailsRecord;
    const chunks = [{ id: randomUUID() }] as SourceContentChunkRecord[];
    const txSourceRepository = {
      save: jest.fn().mockResolvedValue(sourceRecord),
    };
    const txDetailsRepository = {
      save: jest.fn().mockResolvedValue(detailsRecord),
    };
    const txChunkRepository = {
      save: jest.fn().mockResolvedValue(chunks),
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
        source: sourceRecord,
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
      repository.saveTextSource(source, { text: 'Policy', chunks: [] }),
    ).resolves.toBe(source);
    expect(txSourceRepository.save).toHaveBeenCalledWith(sourceRecord);
    expect(txDetailsRepository.save).toHaveBeenCalledWith(detailsRecord);
    expect(txChunkRepository.save).toHaveBeenCalledWith(chunks);
  });
});
