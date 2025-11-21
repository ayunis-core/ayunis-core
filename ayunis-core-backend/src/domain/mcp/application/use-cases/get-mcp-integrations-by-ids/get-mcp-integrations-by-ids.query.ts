import { UUID } from 'crypto';

export class GetMcpIntegrationsByIdsQuery {
  constructor(public readonly integrationIds: UUID[]) {}
}
