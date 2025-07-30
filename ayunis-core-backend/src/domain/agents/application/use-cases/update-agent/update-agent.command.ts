import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class UpdateAgentCommand {
  constructor(
    public readonly agentId: UUID,
    public readonly name: string,
    public readonly instructions: string,
    public readonly modelId: UUID,
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly toolAssignments: Array<{
      id?: UUID;
      toolType: ToolType;
      toolConfigId: UUID | null;
      isEnabled: boolean;
    }>,
  ) {}
}
