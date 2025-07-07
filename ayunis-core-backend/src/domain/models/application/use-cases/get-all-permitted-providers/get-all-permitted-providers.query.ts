import { UUID } from 'crypto';

export class GetAllPermittedProvidersQuery {
  constructor(public readonly orgId: UUID) {}
}
