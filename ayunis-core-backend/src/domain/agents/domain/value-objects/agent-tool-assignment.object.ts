import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class AgentToolAssignment {
  public readonly toolType: ToolType;
  public readonly toolConfigId: UUID | null;

  constructor(params: { toolType: ToolType; toolConfigId?: UUID | null }) {
    this.toolType = params.toolType;
    this.toolConfigId = params.toolConfigId ?? null;
  }

  isConfigurable(): boolean {
    return this.toolConfigId !== null;
  }

  isContextual(): boolean {
    return this.toolConfigId === null;
  }
}
