import { UUID } from 'crypto';

export class GetTrialQuery {
  constructor(public readonly orgId: UUID) {}
}

