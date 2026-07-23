import type { Model } from 'src/domain/models/domain/model.entity';

export class ResolveModelProviderQuery {
  constructor(public readonly model: Model) {}
}
