import { Injectable } from '@nestjs/common';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { AgentSourceAssignmentRecord } from '../schema/agent-source-assignment.record';
import { SourceMapper } from '../../../../sources/infrastructure/persistence/local/mappers/source.mapper';

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
    agentId: string,
  ): AgentSourceAssignmentRecord {
    const record = new AgentSourceAssignmentRecord();
    record.id = domain.id;
    record.agentId = agentId as any;
    record.sourceId = domain.source.id as any;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}