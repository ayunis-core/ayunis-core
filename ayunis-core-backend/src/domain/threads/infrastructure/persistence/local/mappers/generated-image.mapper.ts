import { Injectable } from '@nestjs/common';
import { GeneratedImage } from 'src/domain/threads/domain/generated-image.entity';
import { GeneratedImageRecord } from '../schema/generated-image.record';

@Injectable()
export class GeneratedImageMapper {
  toDomain(record: GeneratedImageRecord): GeneratedImage {
    return new GeneratedImage(
      record.id,
      record.orgId,
      record.userId,
      record.threadId,
      record.contentType,
      record.isAnonymous,
      record.storageKey,
      record.createdAt,
      record.updatedAt,
    );
  }

  toRecord(entity: GeneratedImage): GeneratedImageRecord {
    const record = new GeneratedImageRecord();
    record.id = entity.id;
    record.orgId = entity.orgId;
    record.userId = entity.userId;
    record.threadId = entity.threadId;
    record.contentType = entity.contentType;
    record.isAnonymous = entity.isAnonymous;
    record.storageKey = entity.storageKey;
    if (entity.createdAt) {
      record.createdAt = entity.createdAt;
    }
    if (entity.updatedAt) {
      record.updatedAt = entity.updatedAt;
    }
    return record;
  }
}
