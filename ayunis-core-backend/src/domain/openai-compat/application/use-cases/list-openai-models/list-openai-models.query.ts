import type { UUID } from 'crypto';

export class ListOpenAIModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
