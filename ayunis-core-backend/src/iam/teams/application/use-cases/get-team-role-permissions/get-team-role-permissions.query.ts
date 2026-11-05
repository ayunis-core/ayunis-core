import type { UUID } from 'crypto';

export class GetTeamRolePermissionsQuery {
  constructor(public readonly teamId: UUID) {}
}
