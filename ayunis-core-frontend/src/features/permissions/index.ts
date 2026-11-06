export { useAuthorization } from './api/useAuthorization';
export { useMyPermissions } from './api/useMyPermissions';
export { useMyTeams } from './api/useMyTeams';
export { PermissionGate } from './ui/PermissionGate';
export { TeamPermissionGate } from './ui/TeamPermissionGate';
export { createAuthorization } from './lib/authorization';
export type {
  AppPermission,
  Authorization,
  TeamAccess,
} from './lib/authorization';
export {
  allowedSettingsSections,
  MANAGER_SETTINGS_SECTIONS,
} from './lib/settings-access';
