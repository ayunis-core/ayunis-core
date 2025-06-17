import { UUID } from 'crypto';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';

export class FindOneToolQuery {
  type: ToolType;

  constructor(params: { type: ToolType }) {
    this.type = params.type;
  }
}

export class FindOneConfigurableToolQuery extends FindOneToolQuery {
  configId: UUID;
  userId: UUID;

  constructor(params: { type: ToolType; configId: UUID; userId: UUID }) {
    super({ type: params.type });
    this.configId = params.configId;
    this.userId = params.userId;
  }
}
