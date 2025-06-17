import { UUID } from 'crypto';

export class GetPermittedModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
