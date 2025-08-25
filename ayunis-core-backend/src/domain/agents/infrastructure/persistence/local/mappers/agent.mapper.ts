import { Agent } from '../../../../domain/agent.entity';
import { AgentRecord } from '../schema/agent.record';
import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { AgentToolMapper } from './agent-tool.mapper';
import { AgentSourceAssignmentMapper } from './agent-source-assignment.mapper';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class AgentMapper {
  private readonly logger = new Logger(AgentMapper.name);
  constructor(
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly agentToolMapper: AgentToolMapper,
    private readonly agentSourceAssignmentMapper: AgentSourceAssignmentMapper,
  ) {}

  toDomain(record: AgentRecord): Agent {
    this.logger.debug('toDomain', { record });
    return new Agent({
      id: record.id,
      name: record.name,
      instructions: record.instructions,
      model: this.permittedModelMapper.toDomain(
        record.model,
      ) as PermittedLanguageModel,
      toolAssignments: record.agentTools?.map((toolRecord) =>
        this.agentToolMapper.toDomain(toolRecord),
      ),
      sourceAssignments: record.agentSources?.map((sourceRecord) =>
        this.agentSourceAssignmentMapper.toDomain(sourceRecord),
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
    entity.agentSources = domain.sourceAssignments.map((sourceAssignment) =>
      this.agentSourceAssignmentMapper.toRecord(sourceAssignment, domain.id),
    );
    return entity;
  }
}
