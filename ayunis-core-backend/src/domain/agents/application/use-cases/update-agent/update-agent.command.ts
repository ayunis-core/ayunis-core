import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class UpdateAgentCommand {
  public readonly agentId: UUID;
  public readonly name: string;
  public readonly instructions: string;
  public readonly modelId: UUID;
  public readonly toolAssignments: Array<{
    id?: UUID;
    toolType: ToolType;
    toolConfigId: UUID | null;
    isEnabled: boolean;
  }>;

  constructor(params: {
    agentId: UUID;
    name: string;
    instructions: string;
    modelId: UUID;
    toolAssignments: Array<{
      id?: UUID;
      toolType: ToolType;
      toolConfigId: UUID | null;
      isEnabled: boolean;
    }>;
  }) {
    this.agentId = params.agentId;
    this.name = params.name;
    this.instructions = params.instructions;
    this.modelId = params.modelId;
    this.toolAssignments = params.toolAssignments;
  }
}
