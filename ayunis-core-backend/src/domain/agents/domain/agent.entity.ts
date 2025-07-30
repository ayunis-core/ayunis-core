import { randomUUID, UUID } from 'crypto';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ContextualTool } from 'src/domain/tools/domain/contextual-tool.entity';
import { ConfigurableTool } from 'src/domain/tools/domain/configurable-tool.entity';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { AgentToolAssignment } from './agent-tool-assignment.entity';

export class Agent {
  public readonly id: UUID;
  public readonly name: string;
  public readonly instructions: string;
  public readonly model: PermittedModel;
  public readonly toolAssignments: Array<AgentToolAssignment>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly userId: UUID;

  constructor(params: {
    id?: UUID;
    name: string;
    instructions: string;
    model: PermittedModel;
    toolAssignments?: Array<AgentToolAssignment>;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.instructions = params.instructions;
    this.model = params.model;
    this.toolAssignments = params.toolAssignments ?? [];
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get tools(): Array<Tool> {
    return this.toolAssignments.map((assignment) => assignment.tool);
  }

  /**
   * Get all contextual tools
   */
  get contextualTools(): Array<ContextualTool> {
    return this.tools.filter((tool) => tool instanceof ContextualTool);
  }

  /**
   * Get all configurable tools
   */
  get configurableTools(): Array<ConfigurableTool<ToolConfig>> {
    return this.tools.filter(
      (tool): tool is ConfigurableTool<ToolConfig> =>
        tool instanceof ConfigurableTool,
    );
  }
}
