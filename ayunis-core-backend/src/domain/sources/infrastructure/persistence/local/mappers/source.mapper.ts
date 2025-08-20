import { Source } from '../../../../domain/source.entity';
import { FileSource } from '../../../../domain/sources/file-source.entity';
import { UrlSource } from '../../../../domain/sources/url-source.entity';
import { SourceRecord } from '../schema/source.record';
import { FileSourceRecord } from '../schema/file-source.record';
import { UrlSourceRecord } from '../schema/url-source.record';
import { SourceType } from '../../../../domain/source-type.enum';
import { Injectable } from '@nestjs/common';
import { SourceContent } from 'src/domain/sources/domain/source-content.entity';
import { SourceContentMapper } from './source-content.mapper';

@Injectable()
export class SourceMapper {
  constructor(private readonly sourceContentMapper: SourceContentMapper) {}

  toDomain(entity: SourceRecord): Source {
    if (entity.type === SourceType.FILE) {
      return this.fileSourceToDomain(entity as FileSourceRecord);
    } else if (entity.type === SourceType.URL) {
      return this.urlSourceToDomain(entity as UrlSourceRecord);
    }

    throw new Error(`Invalid source type`);
  }

  private fileSourceToDomain(entity: FileSourceRecord): FileSource {
    return new FileSource({
      id: entity.id,
      fileType: entity.fileType,
      fileSize: entity.fileSize,
      fileName: entity.name,
      text: entity.text,
      content: entity.content.map(
        (c) =>
          new SourceContent({
            id: c.id,
            sourceId: entity.id,
            content: c.content,
            meta: {},
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }),
      ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private urlSourceToDomain(entity: UrlSourceRecord): UrlSource {
    return new UrlSource({
      id: entity.id,
      url: entity.url,
      websiteTitle: entity.name,
      text: entity.text,
      content: entity.content.map(
        (c) =>
          new SourceContent({
            id: c.id,
            sourceId: entity.id,
            content: c.content,
            meta: {},
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }),
      ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toRecord(source: Source): SourceRecord {
    if (source instanceof FileSource) {
      return this.fileSourceToRecord(source);
    } else if (source instanceof UrlSource) {
      return this.urlSourceToRecord(source);
    }

    throw new Error('Invalid source type: ' + source.type);
  }

  fileSourceToRecord(source: FileSource): FileSourceRecord {
    const entity = new FileSourceRecord();
    entity.id = source.id;
    entity.type = SourceType.FILE;
    entity.fileType = source.fileType;
    entity.fileSize = source.fileSize;
    entity.name = source.name;
    entity.text = source.text;
    entity.content = source.content.map((c) =>
      this.sourceContentMapper.toEntity(c),
    );
    entity.createdAt = source.createdAt;
    entity.updatedAt = source.updatedAt;

    return entity;
  }

  urlSourceToRecord(source: UrlSource): UrlSourceRecord {
    const entity = new UrlSourceRecord();
    entity.id = source.id;
    entity.type = SourceType.URL;
    entity.url = source.url;
    entity.name = source.name;
    entity.text = source.text;
    entity.content = source.content.map((c) =>
      this.sourceContentMapper.toEntity(c),
    );
    entity.createdAt = source.createdAt;
    entity.updatedAt = source.updatedAt;

    return entity;
  }
}
