import { Injectable } from '@nestjs/common';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

@Injectable()
export class KnowledgeBaseMapper {
  toDomain(record: KnowledgeBaseRecord): KnowledgeBase {
    const params = {
      id: record.id,
      name: record.name,
      description: record.description,
      orgId: record.orgId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    if ((record.userId === null) === (record.workspaceId === null)) {
      throw new Error(`Knowledge base ${record.id} has invalid ownership`);
    }
    if (record.userId !== null) {
      return new PersonalKnowledgeBase({ ...params, userId: record.userId });
    }
    if (record.workspaceId !== null) {
      return new WorkspaceKnowledgeBase({
        ...params,
        workspaceId: record.workspaceId,
      });
    }
    throw new Error(`Knowledge base ${record.id} has no owner`);
  }

  toPersonal(record: KnowledgeBaseRecord): PersonalKnowledgeBase {
    const entity = this.toDomain(record);
    if (!(entity instanceof PersonalKnowledgeBase)) {
      throw new Error(`Expected personal knowledge base ${record.id}`);
    }
    return entity;
  }

  toWorkspace(record: KnowledgeBaseRecord): WorkspaceKnowledgeBase {
    const entity = this.toDomain(record);
    if (!(entity instanceof WorkspaceKnowledgeBase)) {
      throw new Error(`Expected workspace knowledge base ${record.id}`);
    }
    return entity;
  }

  toRecord(entity: KnowledgeBase): KnowledgeBaseRecord {
    const record = new KnowledgeBaseRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.description = entity.description;
    record.orgId = entity.orgId;
    record.userId =
      entity instanceof PersonalKnowledgeBase ? entity.userId : null;
    record.workspaceId =
      entity instanceof WorkspaceKnowledgeBase ? entity.workspaceId : null;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
