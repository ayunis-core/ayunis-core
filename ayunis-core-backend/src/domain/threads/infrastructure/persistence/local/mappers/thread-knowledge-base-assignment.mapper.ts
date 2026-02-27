import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { KnowledgeBaseAssignment } from '../../../../domain/thread-knowledge-base-assignment.entity';
import { ThreadKnowledgeBaseAssignmentRecord } from '../schema/thread-knowledge-base-assignment.record';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

@Injectable()
export class ThreadKnowledgeBaseAssignmentMapper {
  toDomain(
    record: ThreadKnowledgeBaseAssignmentRecord,
  ): KnowledgeBaseAssignment {
    return new KnowledgeBaseAssignment({
      id: record.id,
      knowledgeBase: {
        id: record.knowledgeBaseId,
        name: record.knowledgeBase.name,
      },
      originSkillId: record.originSkillId ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(
    domain: KnowledgeBaseAssignment,
    threadId: UUID,
  ): ThreadKnowledgeBaseAssignmentRecord {
    const record = new ThreadKnowledgeBaseAssignmentRecord();
    record.id = domain.id;
    record.threadId = threadId;
    record.knowledgeBaseId = domain.knowledgeBase.id;
    record.knowledgeBase = {
      id: domain.knowledgeBase.id,
    } as KnowledgeBaseRecord;
    record.originSkillId = domain.originSkillId ?? null;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
