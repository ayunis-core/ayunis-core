import { randomUUID, UUID } from 'crypto';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { AgentToolAssignment } from './agent-tool-assignment.entity';
import { AgentSourceAssignment } from './agent-source-assignment.entity';

export class Agent {
  public readonly id: UUID;
  public readonly name: string;
  public readonly instructions: string;
  public readonly model: PermittedLanguageModel;
  public readonly toolAssignments: Array<AgentToolAssignment>;
  public readonly sourceAssignments: Array<AgentSourceAssignment>;
  public readonly mcpIntegrationIds: UUID[];
  public readonly marketplaceIdentifier: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly userId: UUID;

  constructor(params: {
    id?: UUID;
    name: string;
    instructions: string;
    model: PermittedLanguageModel;
    toolAssignments?: Array<AgentToolAssignment>;
    sourceAssignments?: Array<AgentSourceAssignment>;
    mcpIntegrationIds?: UUID[];
    marketplaceIdentifier?: string | null;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.instructions = params.instructions;
    this.model = params.model;
    this.toolAssignments = params.toolAssignments ?? [];
    this.sourceAssignments = params.sourceAssignments ?? [];
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.marketplaceIdentifier = params.marketplaceIdentifier ?? null;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get tools(): Array<Tool> {
    return this.toolAssignments.map((assignment) => assignment.tool);
  }
}
