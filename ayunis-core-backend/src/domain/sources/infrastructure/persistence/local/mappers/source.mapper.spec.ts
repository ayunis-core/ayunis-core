import { randomUUID } from 'crypto';
import { SourceMapper } from './source.mapper';
import type { SourceContentChunkMapper } from './source-content-chunk.mapper';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { DataSourceRecord } from '../schema/source.record';
import { CSVDataSourceDetailsRecord } from '../schema/data-source-details.record';

describe('SourceMapper', () => {
  let mapper: SourceMapper;
  let mockContentChunkMapper: Partial<SourceContentChunkMapper>;

  beforeEach(() => {
    mockContentChunkMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn(),
    };
    mapper = new SourceMapper(
      mockContentChunkMapper as SourceContentChunkMapper,
    );
  });

  describe('CSVDataSource mapping', () => {
    describe('toDomain', () => {
      it('should map SourceCreator.USER from record to domain', () => {
        const record = new DataSourceRecord();
        record.id = randomUUID();
        record.name = 'Test CSV';
        record.createdBy = SourceCreator.USER;
        record.createdAt = new Date();
        record.updatedAt = new Date();

        const details = new CSVDataSourceDetailsRecord();
        details.data = { headers: ['col1'], rows: [['val1']] };
        record.dataSourceDetails = details;

        const domain = mapper.toDomain(record);

        expect(domain).toBeInstanceOf(CSVDataSource);
        expect(domain.createdBy).toBe(SourceCreator.USER);
      });

      it('should map SourceCreator.LLM from record to domain', () => {
        const record = new DataSourceRecord();
        record.id = randomUUID();
        record.name = 'Test CSV';
        record.createdBy = SourceCreator.LLM;
        record.createdAt = new Date();
        record.updatedAt = new Date();

        const details = new CSVDataSourceDetailsRecord();
        details.data = { headers: ['col1'], rows: [['val1']] };
        record.dataSourceDetails = details;

        const domain = mapper.toDomain(record);

        expect(domain).toBeInstanceOf(CSVDataSource);
        expect(domain.createdBy).toBe(SourceCreator.LLM);
      });

      it('should map SourceCreator.SYSTEM from record to domain', () => {
        const record = new DataSourceRecord();
        record.id = randomUUID();
        record.name = 'Test CSV';
        record.createdBy = SourceCreator.SYSTEM;
        record.createdAt = new Date();
        record.updatedAt = new Date();

        const details = new CSVDataSourceDetailsRecord();
        details.data = { headers: ['col1'], rows: [['val1']] };
        record.dataSourceDetails = details;

        const domain = mapper.toDomain(record);

        expect(domain).toBeInstanceOf(CSVDataSource);
        expect(domain.createdBy).toBe(SourceCreator.SYSTEM);
      });
    });

    describe('toRecord', () => {
      it('should map SourceCreator.USER from domain to record', () => {
        const domain = new CSVDataSource({
          id: randomUUID(),
          name: 'Test CSV',
          data: { headers: ['col1'], rows: [['val1']] },
          createdBy: SourceCreator.USER,
        });

        const { source: record } = mapper.toRecord(domain);

        expect(record).toBeInstanceOf(DataSourceRecord);
        expect(record.createdBy).toBe(SourceCreator.USER);
      });

      it('should map SourceCreator.LLM from domain to record', () => {
        const domain = new CSVDataSource({
          id: randomUUID(),
          name: 'Test CSV',
          data: { headers: ['col1'], rows: [['val1']] },
          createdBy: SourceCreator.LLM,
        });

        const { source: record } = mapper.toRecord(domain);

        expect(record).toBeInstanceOf(DataSourceRecord);
        expect(record.createdBy).toBe(SourceCreator.LLM);
      });

      it('should map SourceCreator.SYSTEM from domain to record', () => {
        const domain = new CSVDataSource({
          id: randomUUID(),
          name: 'Test CSV',
          data: { headers: ['col1'], rows: [['val1']] },
          createdBy: SourceCreator.SYSTEM,
        });

        const { source: record } = mapper.toRecord(domain);

        expect(record).toBeInstanceOf(DataSourceRecord);
        expect(record.createdBy).toBe(SourceCreator.SYSTEM);
      });
    });
  });
});
