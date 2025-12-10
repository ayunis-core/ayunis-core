import { AgentSourceAssignmentRecord } from '../schema/agent-source-assignment.record';
import { Injectable } from '@nestjs/common';
import { AgentSourceAssignment } from '../../../../domain/agent-source-assignment.entity';
import { SourceMapper } from '../../../../../sources/infrastructure/persistence/local/mappers/source.mapper';
import { UUID } from 'crypto';

@Injectable()
export class AgentSourceAssignmentMapper {
  constructor(private readonly sourceMapper: SourceMapper) {}

  toDomain(record: AgentSourceAssignmentRecord): AgentSourceAssignment {
    return new AgentSourceAssignment({
      id: record.id,
      source: this.sourceMapper.toDomain(record.source),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(
    domain: AgentSourceAssignment,
    agentId: UUID,
  ): AgentSourceAssignmentRecord {
    const record = new AgentSourceAssignmentRecord();
    record.id = domain.id;
    record.agentId = agentId;
    record.sourceId = domain.source.id;
    // Note: We intentionally don't set record.source here.
    // The source already exists in the database (created by CreateDataSourceUseCase
    // or CreateTextSourceUseCase). Setting it would cause TypeORM to try to
    // insert it again due to cascade: true, causing a duplicate key error.
    // The sourceId foreign key is sufficient for the relationship.
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
