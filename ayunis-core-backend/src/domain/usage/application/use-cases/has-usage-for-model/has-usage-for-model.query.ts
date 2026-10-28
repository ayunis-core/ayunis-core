import type { UUID } from 'crypto';

export class HasUsageForModelQuery {
  constructor(public readonly modelId: UUID) {}
}
