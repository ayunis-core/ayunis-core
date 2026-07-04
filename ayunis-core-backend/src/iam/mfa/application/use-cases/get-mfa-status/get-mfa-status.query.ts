import type { UUID } from 'crypto';

export class GetMfaStatusQuery {
  constructor(public readonly userId: UUID) {}
}
