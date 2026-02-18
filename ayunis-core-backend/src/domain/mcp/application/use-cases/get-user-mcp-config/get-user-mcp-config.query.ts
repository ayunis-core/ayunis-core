import { UUID } from 'crypto';

export class GetUserMcpConfigQuery {
  constructor(public readonly integrationId: UUID) {}
}
