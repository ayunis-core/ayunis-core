import type { UUID } from 'crypto';

export class GetEffectiveLanguageModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
