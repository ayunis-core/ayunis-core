import type { UUID } from 'crypto';
import type { ModelModeDefaultLevel } from 'src/domain/models/domain/value-objects/model-mode-default-level.enum';

export class GetModelModeDefaultQuery {
  constructor(
    public readonly level: ModelModeDefaultLevel,
    public readonly teamId?: UUID,
  ) {}
}
