import { TeamAdminPermission } from './value-objects/team-admin-permission.enum';

export const DEFAULT_TEAM_ADMIN_PERMISSIONS: ReadonlyArray<TeamAdminPermission> =
  Object.values(TeamAdminPermission);
