import { randomUUID, UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ContextualTool } from 'src/domain/tools/domain/contextual-tool.entity';
import { ConfigurableTool } from 'src/domain/tools/domain/configurable-tool.entity';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';

export class Agent {
  public readonly id: UUID;
  public readonly name: string;
  public readonly instructions: string;
  public readonly model: PermittedModel;
  public readonly tools: Array<Tool>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly userId: UUID;

  constructor(params: {
    id?: UUID;
    name: string;
    instructions: string;
    model: PermittedModel;
    tools?: Array<Tool>;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.instructions = params.instructions;
    this.model = params.model;
    this.tools = params.tools ?? [];
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  /**
   * Get all contextual tools
   */
  getContextualTools(): Array<ContextualTool> {
    return this.tools.filter((tool) => tool instanceof ContextualTool);
  }

  /**
   * Get all configurable tools
   */
  getConfigurableTools(): Array<ConfigurableTool<ToolConfig>> {
    return this.tools.filter(
      (tool): tool is ConfigurableTool<ToolConfig> =>
        tool instanceof ConfigurableTool,
    );
  }

  /**
   * Check if agent has a specific tool assigned
   */
  hasToolAssigned(toolType: ToolType): boolean {
    return this.tools.some((tool) => tool.type === toolType);
  }
}
