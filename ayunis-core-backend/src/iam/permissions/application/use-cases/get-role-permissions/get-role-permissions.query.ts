import type { UUID } from 'crypto';

export class GetRolePermissionsQuery {
  constructor(public readonly orgId: UUID) {}
}
