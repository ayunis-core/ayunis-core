import type { UUID } from 'crypto';

export class FindMcpToolAllowancesQuery {
  constructor(public readonly integrationIds: UUID[]) {}
}
