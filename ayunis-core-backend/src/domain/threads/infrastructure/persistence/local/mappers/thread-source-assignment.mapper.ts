import { ThreadSourceAssignmentRecord } from '../schema/thread-source-assignment.record';
import { Injectable } from '@nestjs/common';
import { SourceAssignment } from '../../../../domain/thread-source-assignment.entity';
import { SourceMapper } from '../../../../../sources/infrastructure/persistence/local/mappers/source.mapper';
import { UUID } from 'crypto';

@Injectable()
export class ThreadSourceAssignmentMapper {
  constructor(private readonly sourceMapper: SourceMapper) {}

  toDomain(record: ThreadSourceAssignmentRecord): SourceAssignment {
    return new SourceAssignment({
      id: record.id,
      source: this.sourceMapper.toDomain(record.source),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(
    domain: SourceAssignment,
    threadId: UUID,
  ): ThreadSourceAssignmentRecord {
    const record = new ThreadSourceAssignmentRecord();
    record.id = domain.id;
    record.threadId = threadId;
    record.sourceId = domain.source.id;
    record.source = this.sourceMapper.toRecord(domain.source).source;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
