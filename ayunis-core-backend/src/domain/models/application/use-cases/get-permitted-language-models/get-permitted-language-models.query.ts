import type { UUID } from 'crypto';

export class GetPermittedLanguageModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
