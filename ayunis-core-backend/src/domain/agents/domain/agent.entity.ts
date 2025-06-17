import { randomUUID, UUID } from 'crypto';
import { AgentToolAssignment } from './value-objects/agent-tool-assignment.object';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

export class Agent {
  public readonly id: UUID;
  public readonly name: string;
  public readonly instructions: string;
  public readonly model: PermittedModel;
  public readonly toolAssignments: AgentToolAssignment[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly userId: UUID;

  constructor(params: {
    id?: UUID;
    name: string;
    instructions: string;
    model: PermittedModel;
    toolAssignments?: AgentToolAssignment[];
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

  /**
   * Get all contextual tool assignments
   */
  getContextualTools(): AgentToolAssignment[] {
    return this.toolAssignments.filter((assignment) =>
      assignment.isContextual(),
    );
  }

  /**
   * Get all configurable tool assignments
   */
  getConfigurableTools(): AgentToolAssignment[] {
    return this.toolAssignments.filter((assignment) =>
      assignment.isConfigurable(),
    );
  }

  /**
   * Check if agent has a specific tool assigned
   */
  hasToolAssigned(toolType: ToolType): boolean {
    return this.toolAssignments.some(
      (assignment) => assignment.toolType === toolType,
    );
  }
}
