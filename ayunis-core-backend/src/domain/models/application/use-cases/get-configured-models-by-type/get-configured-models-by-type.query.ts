import type { UUID } from 'crypto';
import type { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';

export class GetConfiguredModelsByTypeQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly type: ModelType,
  ) {}
}
