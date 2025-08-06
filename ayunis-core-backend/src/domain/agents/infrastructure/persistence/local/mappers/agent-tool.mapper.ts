import { AgentToolAssignmentRecord } from '../schema/agent-tool.record';
import { Injectable } from '@nestjs/common';
import { ToolConfigMapper } from 'src/domain/tools/infrastructure/persistence/local/mappers/tool-config.mapper';
import { ToolFactory } from 'src/domain/tools/application/tool.factory';
import { UUID } from 'crypto';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ConfigurableTool } from 'src/domain/tools/domain/configurable-tool.entity';
import { AgentToolAssignment } from 'src/domain/agents/domain/agent-tool-assignment.entity';

@Injectable()
export class AgentToolMapper {
  constructor(
    private readonly toolFactory: ToolFactory,
    private readonly toolConfigMapper: ToolConfigMapper,
  ) {}

  toDomain(record: AgentToolAssignmentRecord): AgentToolAssignment {
    return new AgentToolAssignment({
      id: record.id,
      tool: this.toolFactory.createTool({
        type: record.toolType,
        config: record.toolConfig
          ? this.toolConfigMapper.toDomain(record.toolConfig)
          : undefined,
      }),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(
    domain: AgentToolAssignment,
    agentId: UUID,
  ): AgentToolAssignmentRecord {
    const record = new AgentToolAssignmentRecord();
    record.id = domain.id;
    record.agentId = agentId;
    record.toolType = domain.tool.type;
    if (domain.tool instanceof ConfigurableTool) {
      record.toolConfig = this.toolConfigMapper.toRecord(
        domain.tool.config as ToolConfig,
      );
    }
    return record;
  }
}
