import { UUID } from 'crypto';

export class GetAvailableModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
