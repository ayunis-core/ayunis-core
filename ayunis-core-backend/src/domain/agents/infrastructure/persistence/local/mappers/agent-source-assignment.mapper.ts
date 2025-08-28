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
    record.source = this.sourceMapper.toRecord(domain.source);
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
