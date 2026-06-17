import type { UUID } from 'crypto';

export class FindTeamsByUserIdQuery {
  constructor(public readonly userId: UUID) {}
}
