import { Injectable } from '@nestjs/common';
import { KnowledgeBase } from '../../../../domain/knowledge-base.entity';
import { KnowledgeBaseRecord } from '../schema/knowledge-base.record';

@Injectable()
export class KnowledgeBaseMapper {
  toDomain(record: KnowledgeBaseRecord): KnowledgeBase {
    return new KnowledgeBase({
      id: record.id,
      name: record.name,
      description: record.description,
      orgId: record.orgId,
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(entity: KnowledgeBase): KnowledgeBaseRecord {
    const record = new KnowledgeBaseRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.description = entity.description;
    record.orgId = entity.orgId;
    record.userId = entity.userId;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
