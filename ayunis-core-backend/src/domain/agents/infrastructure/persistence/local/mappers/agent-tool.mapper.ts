import { AgentToolAssignmentRecord } from '../schema/agent-tool.record';
import { Injectable } from '@nestjs/common';
import { ToolConfigMapper } from 'src/domain/tools/infrastructure/persistence/local/mappers/tool-config.mapper';
import { ToolFactory } from 'src/domain/tools/application/tool.factory';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { UUID } from 'crypto';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ConfigurableTool } from 'src/domain/tools/domain/configurable-tool.entity';

@Injectable()
export class AgentToolMapper {
  constructor(
    private readonly toolFactory: ToolFactory,
    private readonly toolConfigMapper: ToolConfigMapper,
  ) {}

  toDomain(record: AgentToolAssignmentRecord): Tool {
    return this.toolFactory.createTool(
      record.toolType,
      record.toolConfig
        ? this.toolConfigMapper.toDomain(record.toolConfig)
        : undefined,
    );
  }

  toRecord(domain: Tool, agentId: UUID): AgentToolAssignmentRecord {
    const toolRecord = new AgentToolAssignmentRecord();
    toolRecord.agentId = agentId;
    toolRecord.toolType = domain.type;
    if (domain instanceof ConfigurableTool) {
      toolRecord.toolConfig = this.toolConfigMapper.toRecord(
        domain.config as ToolConfig,
      );
    }
    return toolRecord;
  }
}
