import type { UUID } from 'crypto';

export class FindAllUserIdsByTeamIdQuery {
  constructor(public readonly teamId: UUID) {}
}
