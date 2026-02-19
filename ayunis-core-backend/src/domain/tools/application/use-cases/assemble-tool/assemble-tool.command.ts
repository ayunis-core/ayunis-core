import type { UUID } from 'crypto';
import type { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class AssembleToolCommand {
  public readonly type: ToolType;
  public readonly configId?: UUID;
  public readonly context?: unknown;

  constructor(params: { type: ToolType; configId?: UUID; context?: unknown }) {
    this.type = params.type;
    this.configId = params.configId;
    this.context = params.context;
  }
}
