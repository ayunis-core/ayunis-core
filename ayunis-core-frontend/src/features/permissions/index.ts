export { useAuthorization } from './api/useAuthorization';
export { useMyPermissions } from './api/useMyPermissions';
export { useMyTeamAdminTeamIds } from './api/useMyTeamAdminTeamIds';
export { PermissionGate } from './ui/PermissionGate';
export { createAuthorization } from './lib/authorization';
export type {
  AppPermission,
  Authorization,
  TeamAdminPermission,
} from './lib/authorization';
export {
  allowedSettingsSections,
  MANAGER_SETTINGS_SECTIONS,
} from './lib/settings-access';

export { useTeamManagementAccess } from './api/useTeamManagementAccess';
