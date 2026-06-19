import type { UUID } from 'crypto';

export class GetOnboardingQuery {
  constructor(public readonly userId: UUID) {}
}
