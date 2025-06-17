import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class CreateAgentCommand {
  name: string;
  instructions: string;
  modelId: UUID;
  toolAssignments: Array<{
    toolType: ToolType;
    toolConfigId: UUID | null;
  }>;
  userId: UUID;
  orgId: UUID;

  constructor(params: {
    name: string;
    instructions: string;
    modelId: UUID;
    toolAssignments: Array<{
      toolType: ToolType;
      toolConfigId: UUID | null;
    }>;
    userId: UUID;
    orgId: UUID;
  }) {
    this.name = params.name;
    this.instructions = params.instructions;
    this.modelId = params.modelId;
    this.toolAssignments = params.toolAssignments;
    this.userId = params.userId;
    this.orgId = params.orgId;
  }
}
