import { MeResponseDtoRole } from '@/shared/api';
import type { AppPermission, Authorization } from './authorization';

const ALL_SETTINGS = '/admin-settings';

/**
 * Settings sections a non-admin may reach if they hold one of the listed
 * permissions. Sections not listed here are admin-only. Extend this as more
 * role permissions map to settings screens.
 */
export const MANAGER_SETTINGS_SECTIONS: ReadonlyArray<{
  path: string;
  anyOf: AppPermission[];
}> = [
  {
    path: '/admin-settings/teams',
    anyOf: ['manage_teams', 'assign_users_to_teams'],
  },
];

/**
 * Section base-paths the current user may access — the one place that answers
 * "may they see this settings screen?", so no caller repeats the admin check.
 * Admins get the settings root, which prefixes every section.
 */
export function allowedSettingsSections(
  authorization: Authorization,
): string[] {
  if (authorization.hasRole(MeResponseDtoRole.admin)) {
    return [ALL_SETTINGS];
  }

  return MANAGER_SETTINGS_SECTIONS.filter((section) =>
    authorization.canAny(...section.anyOf),
  ).map((section) => section.path);
}
