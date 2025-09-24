import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import {
  FileSourceDetailsRecord,
  TextSourceDetailsRecord,
} from '../schema/text-source-details.record';
import { UrlSourceDetailsRecord } from '../schema/text-source-details.record';
import { Injectable, Logger } from '@nestjs/common';
import { SourceContentChunkMapper } from './source-content-chunk.mapper';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import {
  CSVDataSourceDetailsRecord,
  DataSourceDetailsRecord,
} from '../schema/data-source-details.record';
import {
  CSVDataSource,
  DataSource,
} from 'src/domain/sources/domain/sources/data-source.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import {
  DataSourceRecord,
  SourceRecord,
  TextSourceRecord,
} from '../schema/source.record';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceContentChunkRecord } from '../schema/source-content-chunk.record';

@Injectable()
export class SourceMapper {
  private readonly logger = new Logger(SourceMapper.name);
  constructor(
    private readonly sourceContentChunkMapper: SourceContentChunkMapper,
  ) {}

  toDomain(record: TextSourceRecord): TextSource;
  toDomain(record: DataSourceRecord): DataSource;
  toDomain(record: SourceRecord): Source;
  toDomain(record: SourceRecord): Source {
    if (record instanceof TextSourceRecord) {
      return this.textSourceToDomain(record);
    }
    if (record instanceof DataSourceRecord) {
      return this.dataSourceToDomain(record);
    }

    throw new Error(`Invalid source type`);
  }

  private textSourceToDomain(record: TextSourceRecord): TextSource {
    if (record.textSourceDetails instanceof FileSourceDetailsRecord) {
      return new FileSource({
        id: record.id,
        fileType: record.textSourceDetails.fileType,
        name: record.name,
        type: TextType.FILE,
        text: record.textSourceDetails.text,
        contentChunks: record.textSourceDetails.contentChunks?.map((c) =>
          this.sourceContentChunkMapper.toDomain(c),
        ),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    if (record.textSourceDetails instanceof UrlSourceDetailsRecord) {
      return new UrlSource({
        id: record.id,
        url: record.textSourceDetails.url,
        name: record.name,
        type: TextType.WEB,
        text: record.textSourceDetails.text,
        contentChunks: record.textSourceDetails.contentChunks?.map((c) =>
          this.sourceContentChunkMapper.toDomain(c),
        ),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    throw new Error(`Invalid source type`);
  }

  private dataSourceToDomain(record: DataSourceRecord): DataSource {
    if (record.dataSourceDetails instanceof CSVDataSourceDetailsRecord) {
      return new CSVDataSource({
        id: record.id,
        data: {
          headers: record.dataSourceDetails.data.split('\n')[0].split(','),
          rows: record.dataSourceDetails.data
            .split('\n')
            .slice(1)
            .map((row) => row.split(',')),
        },
        name: record.name,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    throw new Error('not implemented');
  }

  /**
   * These granular overloads are necessary to avoid
   * errors during cascade operations while saving.
   * It seems that because we initialize the IDs in the domain layer,
   * TypeORM is unable to properly set the IDs in the records during cascading.
   */
  toRecord(source: TextSource): {
    source: TextSourceRecord;
    details: TextSourceDetailsRecord;
    contentChunks: SourceContentChunkRecord[];
  };
  toRecord(source: DataSource): {
    source: DataSourceRecord;
    details: DataSourceDetailsRecord;
  };
  toRecord(source: Source): {
    source: SourceRecord;
  };
  toRecord(source: Source): {
    source: SourceRecord;
  } {
    if (source instanceof FileSource) {
      return this.fileSourceToRecord(source);
    }
    if (source instanceof UrlSource) {
      return this.urlSourceToRecord(source);
    }

    throw new Error('Invalid source type: ' + source.type);
  }

  private fileSourceToRecord(source: FileSource): {
    source: TextSourceRecord;
    details: FileSourceDetailsRecord;
    contentChunks: SourceContentChunkRecord[];
  } {
    const record = new TextSourceRecord();
    record.id = source.id;
    record.name = source.name;
    record.createdAt = source.createdAt;
    record.updatedAt = source.updatedAt;

    const details = new FileSourceDetailsRecord();
    details.id = source.id;
    details.fileType = source.fileType;
    details.source = record;
    details.text = source.text;
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;

    const contentChunks = source.contentChunks.map((c) =>
      this.sourceContentChunkMapper.toRecord(details, c),
    );

    return { source: record, details, contentChunks };
  }

  private urlSourceToRecord(source: UrlSource): {
    source: TextSourceRecord;
    details: UrlSourceDetailsRecord;
    contentChunks: SourceContentChunkRecord[];
  } {
    const record = new TextSourceRecord();
    record.id = source.id;
    record.name = source.name;
    record.createdAt = source.createdAt;
    record.updatedAt = source.updatedAt;

    const details = new UrlSourceDetailsRecord();
    details.id = source.id;
    details.url = source.url;
    details.text = source.text;
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;

    const contentChunks = source.contentChunks.map((c) =>
      this.sourceContentChunkMapper.toRecord(details, c),
    );

    return { source: record, details, contentChunks };
  }
}
