import { randomUUID } from 'crypto';
import { SourceMapper } from './source.mapper';
import type { SourceContentChunkMapper } from './source-content-chunk.mapper';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { DataSourceRecord, TextSourceRecord } from '../schema/source.record';
import { CSVDataSourceDetailsRecord } from '../schema/data-source-details.record';
import {
  FileSourceDetailsRecord,
  UrlSourceDetailsRecord,
} from '../schema/text-source-details.record';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentChunkRecord } from '../schema/source-content-chunk.record';

describe('SourceMapper', () => {
  let mapper: SourceMapper;
  let mockContentChunkMapper: Partial<SourceContentChunkMapper>;

  beforeEach(() => {
    mockContentChunkMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn().mockReturnValue(new SourceContentChunkRecord()),
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

  describe('TextSource toDomain', () => {
    it('should map FileSource without text or contentChunks', () => {
      const record = new TextSourceRecord();
      record.id = randomUUID();
      record.name = 'Test File';
      record.createdBy = SourceCreator.USER;
      record.knowledgeBaseId = null;
      record.createdAt = new Date();
      record.updatedAt = new Date();

      const details = new FileSourceDetailsRecord();
      details.fileType = FileType.PDF;
      details.text = 'some text';
      record.textSourceDetails = details;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(FileSource);
      expect(domain.name).toBe('Test File');
      expect((domain as FileSource).fileType).toBe(FileType.PDF);
      // text and contentChunks are NOT on the domain entity
      expect('text' in domain).toBe(false);
      expect('contentChunks' in domain).toBe(false);
    });

    it('should map UrlSource without text or contentChunks', () => {
      const record = new TextSourceRecord();
      record.id = randomUUID();
      record.name = 'Test URL';
      record.createdBy = SourceCreator.USER;
      record.knowledgeBaseId = null;
      record.createdAt = new Date();
      record.updatedAt = new Date();

      const details = new UrlSourceDetailsRecord();
      details.url = 'https://example.com';
      details.text = 'some text';
      record.textSourceDetails = details;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(UrlSource);
      expect(domain.name).toBe('Test URL');
      expect((domain as UrlSource).url).toBe('https://example.com');
      expect('text' in domain).toBe(false);
      expect('contentChunks' in domain).toBe(false);
    });
  });

  describe('toTextSourceRecord', () => {
    it('should create records for FileSource with content', () => {
      const source = new FileSource({
        id: randomUUID(),
        fileType: FileType.PDF,
        name: 'Test File',
        type: TextType.FILE,
        createdBy: SourceCreator.USER,
      });

      const chunks = [
        new TextSourceContentChunk({
          content: 'chunk 1',
          meta: { page: 1 },
        }),
      ];

      const result = mapper.toTextSourceRecord(source, {
        text: 'full text',
        chunks,
      });

      expect(result.source).toBeInstanceOf(TextSourceRecord);
      expect(result.source.id).toBe(source.id);
      expect(result.details).toBeInstanceOf(FileSourceDetailsRecord);
      expect(result.details.text).toBe('full text');
      expect(result.contentChunks).toHaveLength(1);
      expect(mockContentChunkMapper.toRecord).toHaveBeenCalledWith(
        result.details,
        chunks[0],
      );
    });

    it('should create records for UrlSource with content', () => {
      const source = new UrlSource({
        id: randomUUID(),
        url: 'https://example.com',
        name: 'Test URL',
        type: TextType.WEB,
        createdBy: SourceCreator.USER,
      });

      const chunks = [
        new TextSourceContentChunk({
          content: 'chunk 1',
          meta: {},
        }),
        new TextSourceContentChunk({
          content: 'chunk 2',
          meta: {},
        }),
      ];

      const result = mapper.toTextSourceRecord(source, {
        text: 'full url text',
        chunks,
      });

      expect(result.source).toBeInstanceOf(TextSourceRecord);
      expect(result.details).toBeInstanceOf(UrlSourceDetailsRecord);
      expect(result.details.text).toBe('full url text');
      expect(result.contentChunks).toHaveLength(2);
    });
  });
});
