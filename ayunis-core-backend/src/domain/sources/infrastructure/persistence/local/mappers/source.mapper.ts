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
      fileName: entity.fileName,
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

  toEntity(source: Source): SourceRecord {
    if (source instanceof FileSource) {
      return this.fileSourceToEntity(source);
    } else if (source instanceof UrlSource) {
      return this.urlSourceToEntity(source);
    }

    throw new Error('Invalid source type: ' + source.type);
  }

  fileSourceToEntity(source: FileSource): FileSourceRecord {
    const entity = new FileSourceRecord();
    entity.id = source.id;
    entity.type = SourceType.FILE;
    entity.fileType = source.fileType;
    entity.fileSize = source.fileSize;
    entity.fileName = source.fileName;
    entity.content = source.content.map((c) =>
      this.sourceContentMapper.toEntity(c),
    );
    entity.createdAt = source.createdAt;
    entity.updatedAt = source.updatedAt;

    return entity;
  }

  urlSourceToEntity(source: UrlSource): UrlSourceRecord {
    const entity = new UrlSourceRecord();
    entity.id = source.id;
    entity.type = SourceType.URL;
    entity.url = source.url;
    entity.content = source.content.map((c) =>
      this.sourceContentMapper.toEntity(c),
    );
    entity.createdAt = source.createdAt;
    entity.updatedAt = source.updatedAt;

    return entity;
  }
}
