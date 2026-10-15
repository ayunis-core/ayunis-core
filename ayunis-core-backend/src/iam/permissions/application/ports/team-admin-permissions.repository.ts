import type { UUID } from 'crypto';
import type { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

export abstract class TeamAdminPermissionsRepository {
  abstract findByOrgId(orgId: UUID): Promise<TeamAdminPermission[]>;
  abstract setForOrg(
    orgId: UUID,
    permissions: readonly TeamAdminPermission[],
  ): Promise<void>;
}
