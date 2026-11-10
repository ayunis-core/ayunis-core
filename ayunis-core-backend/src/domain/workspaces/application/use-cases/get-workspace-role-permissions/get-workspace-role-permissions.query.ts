import type { UUID } from 'crypto';

export class GetWorkspaceRolePermissionsQuery {
  constructor(public readonly workspaceId: UUID) {}
}
