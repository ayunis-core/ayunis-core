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

  private mapContentChunks(
    details: TextSourceDetailsRecord,
  ): ReturnType<SourceContentChunkMapper['toDomain']>[] {
    return (details.contentChunks ?? []).map((c) =>
      this.sourceContentChunkMapper.toDomain(c),
    );
  }

  private textSourceToDomain(record: TextSourceRecord): TextSource {
    if (record.textSourceDetails instanceof FileSourceDetailsRecord) {
      return new FileSource({
        id: record.id,
        fileType: record.textSourceDetails.fileType,
        name: record.name,
        type: TextType.FILE,
        text: record.textSourceDetails.text,
        contentChunks: this.mapContentChunks(record.textSourceDetails),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy,
      });
    }
    if (record.textSourceDetails instanceof UrlSourceDetailsRecord) {
      return new UrlSource({
        id: record.id,
        url: record.textSourceDetails.url,
        name: record.name,
        type: TextType.WEB,
        text: record.textSourceDetails.text,
        contentChunks: this.mapContentChunks(record.textSourceDetails),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy,
      });
    }

    throw new Error(`Invalid source type`);
  }

  private dataSourceToDomain(record: DataSourceRecord): DataSource {
    if (record.dataSourceDetails instanceof CSVDataSourceDetailsRecord) {
      return new CSVDataSource({
        id: record.id,
        data: record.dataSourceDetails.data,
        name: record.name,
        createdBy: record.createdBy,
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
    if (source instanceof CSVDataSource) {
      return this.dataSourceToRecord(source);
    }

    throw new Error('Invalid source type: ' + source.type);
  }

  private createTextSourceRecord(source: TextSource): TextSourceRecord {
    const record = new TextSourceRecord();
    record.id = source.id;
    record.name = source.name;
    record.createdBy = source.createdBy;
    record.createdAt = source.createdAt;
    record.updatedAt = source.updatedAt;
    return record;
  }

  private buildTextSourceResult<T extends TextSourceDetailsRecord>(
    record: TextSourceRecord,
    details: T,
    source: TextSource,
  ): {
    source: TextSourceRecord;
    details: T;
    contentChunks: SourceContentChunkRecord[];
  } {
    const contentChunks = source.contentChunks.map((c) =>
      this.sourceContentChunkMapper.toRecord(details, c),
    );
    record.textSourceDetails = details;
    return { source: record, details, contentChunks };
  }

  private fileSourceToRecord(source: FileSource): {
    source: TextSourceRecord;
    details: FileSourceDetailsRecord;
    contentChunks: SourceContentChunkRecord[];
  } {
    const record = this.createTextSourceRecord(source);

    const details = new FileSourceDetailsRecord();
    details.id = source.id;
    details.fileType = source.fileType;
    details.source = record;
    details.text = source.text;
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;

    return this.buildTextSourceResult(record, details, source);
  }

  private urlSourceToRecord(source: UrlSource): {
    source: TextSourceRecord;
    details: UrlSourceDetailsRecord;
    contentChunks: SourceContentChunkRecord[];
  } {
    const record = this.createTextSourceRecord(source);

    const details = new UrlSourceDetailsRecord();
    details.id = source.id;
    details.url = source.url;
    details.text = source.text;
    details.source = record;
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;

    return this.buildTextSourceResult(record, details, source);
  }

  private dataSourceToRecord(source: CSVDataSource): {
    source: DataSourceRecord;
    details: CSVDataSourceDetailsRecord;
  } {
    const record = new DataSourceRecord();
    record.id = source.id;
    record.name = source.name;
    record.createdBy = source.createdBy;
    record.createdAt = source.createdAt;
    record.updatedAt = source.updatedAt;

    const details = new CSVDataSourceDetailsRecord();
    details.id = source.id;
    details.data = source.data;
    details.source = record;
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;

    // Set bidirectional relationship
    record.dataSourceDetails = details;

    return { source: record, details };
  }
}
