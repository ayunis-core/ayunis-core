import { UUID } from 'crypto';
import { AgentToolAssignment } from '../../domain/value-objects/agent-tool-assignment.object';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export abstract class AgentToolRepository {
  abstract assignTool(
    agentId: UUID,
    assignment: AgentToolAssignment,
  ): Promise<void>;

  abstract unassignTool(agentId: UUID, toolName: string): Promise<void>;
  abstract findByAgentId(agentId: UUID): Promise<AgentToolAssignment[]>;
  abstract findAgentsByTool(toolName: string): Promise<UUID[]>;
  abstract findAgentsByToolType(toolType: ToolType): Promise<UUID[]>;
  abstract findAgentsByToolConfig(toolConfigId: UUID): Promise<UUID[]>;
  abstract hasToolAssigned(agentId: UUID, toolName: string): Promise<boolean>;
}
