import { UUID } from 'crypto';

export class GetOrgDefaultModelQuery {
  constructor(public readonly orgId: UUID) {}
}
