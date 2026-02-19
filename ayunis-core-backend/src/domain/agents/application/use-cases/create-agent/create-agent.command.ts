import type { UUID } from 'crypto';
import type { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class CreateAgentCommand {
  name: string;
  instructions: string;
  modelId: UUID;
  toolAssignments: Array<{
    toolType: ToolType;
    toolConfigId: UUID | null;
  }>;

  constructor(params: {
    name: string;
    instructions: string;
    modelId: UUID;
    toolAssignments: Array<{
      toolType: ToolType;
      toolConfigId: UUID | null;
    }>;
  }) {
    this.name = params.name;
    this.instructions = params.instructions;
    this.modelId = params.modelId;
    this.toolAssignments = params.toolAssignments;
  }
}
