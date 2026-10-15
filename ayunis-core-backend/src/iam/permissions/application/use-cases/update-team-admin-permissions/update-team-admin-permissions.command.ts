import type { UUID } from 'crypto';
import type { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

export class UpdateTeamAdminPermissionsCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly permissions: TeamAdminPermission[],
  ) {}
}
