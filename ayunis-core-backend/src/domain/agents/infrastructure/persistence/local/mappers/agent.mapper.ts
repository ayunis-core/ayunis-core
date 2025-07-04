import { Agent } from '../../../../domain/agent.entity';
import { AgentRecord } from '../schema/agent.record';
import { Injectable } from '@nestjs/common';
import { AgentToolMapper } from './agent-tool.mapper';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';

@Injectable()
export class AgentMapper {
  constructor(private readonly permittedModelMapper: PermittedModelMapper) {}

  toDomain(entity: AgentRecord): Agent {
    return new Agent({
      id: entity.id,
      name: entity.name,
      instructions: entity.instructions,
      model: this.permittedModelMapper.toDomain(entity.model),
      toolAssignments: AgentToolMapper.toDomainArray(entity.agentTools),
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Agent): AgentRecord {
    const entity = new AgentRecord();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.instructions = domain.instructions;
    entity.model = this.permittedModelMapper.toRecord(domain.model);
    entity.userId = domain.userId;
    entity.agentTools = domain.toolAssignments.map((assignment) =>
      AgentToolMapper.toEntity(domain.id, assignment),
    );
    return entity;
  }
}
