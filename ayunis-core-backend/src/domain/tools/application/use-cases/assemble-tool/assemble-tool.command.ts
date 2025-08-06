import { UUID } from 'crypto';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export class AssembleToolCommand {
  public readonly type: ToolType;
  public readonly configId?: UUID;
  public readonly context?: unknown;
  public readonly userId: UUID;

  constructor(params: {
    type: ToolType;
    configId?: UUID;
    context?: unknown;
    userId: UUID;
  }) {
    this.type = params.type;
    this.configId = params.configId;
    this.context = params.context;
    this.userId = params.userId;
  }
}
