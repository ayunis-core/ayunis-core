import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { FileSourceDetailsRecord } from '../schema/text-source-details.record';
import { UrlSourceDetailsRecord } from '../schema/text-source-details.record';
import { Injectable } from '@nestjs/common';
import { SourceContentMapper } from './source-content.mapper';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CSVDataSourceDetailsRecord } from '../schema/data-source-details.record';
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

@Injectable()
export class SourceMapper {
  constructor(private readonly sourceContentMapper: SourceContentMapper) {}

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
        type: record.textSourceDetails.textType,
        text: record.textSourceDetails.text,
        contentChunks: record.textSourceDetails.contentChunks.map((c) =>
          this.sourceContentMapper.toEntity(c),
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
        type: record.textSourceDetails.textType,
        text: record.textSourceDetails.text,
        contentChunks: record.textSourceDetails.contentChunks.map((c) =>
          this.sourceContentMapper.toEntity(c),
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

  toRecord(source: TextSource): TextSourceRecord;
  toRecord(source: DataSource): DataSourceRecord;
  toRecord(source: Source): SourceRecord;
  toRecord(source: Source): SourceRecord {
    if (source instanceof FileSource) {
      return this.fileSourceToRecord(source);
    }
    if (source instanceof UrlSource) {
      return this.urlSourceToRecord(source);
    }

    throw new Error('Invalid source type: ' + source.type);
  }

  private fileSourceToRecord(source: FileSource): TextSourceRecord {
    const sourceRecord = new TextSourceRecord();
    sourceRecord.id = source.id;
    sourceRecord.name = source.name;
    sourceRecord.type = source.type;
    sourceRecord.createdAt = source.createdAt;
    sourceRecord.updatedAt = source.updatedAt;

    const details = new FileSourceDetailsRecord();
    details.id = source.id;
    details.textType = source.textType;
    details.fileType = source.fileType;
    details.text = source.text;
    details.contentChunks = source.contentChunks.map((c) =>
      this.sourceContentMapper.toEntity(c),
    );
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;
    sourceRecord.textSourceDetails = details;

    return sourceRecord;
  }

  private urlSourceToRecord(source: UrlSource): TextSourceRecord {
    const sourceRecord = new TextSourceRecord();
    sourceRecord.id = source.id;
    sourceRecord.name = source.name;
    sourceRecord.type = source.type;
    sourceRecord.createdAt = source.createdAt;
    sourceRecord.updatedAt = source.updatedAt;

    const details = new UrlSourceDetailsRecord();
    details.id = source.id;
    details.textType = source.textType;
    details.url = source.url;
    details.text = source.text;
    details.contentChunks = source.contentChunks.map((c) =>
      this.sourceContentMapper.toEntity(c),
    );
    details.createdAt = source.createdAt;
    details.updatedAt = source.updatedAt;
    sourceRecord.textSourceDetails = details;

    return sourceRecord;
  }
}
