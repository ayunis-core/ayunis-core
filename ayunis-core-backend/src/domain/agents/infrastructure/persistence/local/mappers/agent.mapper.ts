import { Agent } from '../../../../domain/agent.entity';
import { AgentRecord } from '../schema/agent.record';
import { Injectable } from '@nestjs/common';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { AgentToolMapper } from './agent-tool.mapper';

@Injectable()
export class AgentMapper {
  constructor(
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly agentToolMapper: AgentToolMapper,
  ) {}

  toDomain(record: AgentRecord): Agent {
    return new Agent({
      id: record.id,
      name: record.name,
      instructions: record.instructions,
      model: this.permittedModelMapper.toDomain(record.model),
      toolAssignments: record.agentTools?.map((toolRecord) =>
        this.agentToolMapper.toDomain(toolRecord),
      ),
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: Agent): AgentRecord {
    const entity = new AgentRecord();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.instructions = domain.instructions;
    entity.modelId = domain.model.id;
    entity.model = this.permittedModelMapper.toRecord(domain.model);
    entity.userId = domain.userId;
    entity.agentTools = domain.toolAssignments.map((toolAssignment) =>
      this.agentToolMapper.toRecord(toolAssignment, domain.id),
    );
    return entity;
  }
}
