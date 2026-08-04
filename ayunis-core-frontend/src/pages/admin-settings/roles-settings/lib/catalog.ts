import type { Permission, PermissionGroup } from '../model/types';

export interface PermissionGroupSection {
  group: PermissionGroup;
  permissions: Permission[];
}

// Section order and membership for the permission matrix. Labels for both the
// group and each permission come from the `admin-settings-roles` namespace.
export const PERMISSION_SECTIONS: readonly PermissionGroupSection[] = [
  { group: 'teams', permissions: ['manage_teams', 'assign_users_to_teams'] },
  { group: 'skills', permissions: ['manage_skills', 'share_skills'] },
  {
    group: 'knowledge_bases',
    permissions: ['manage_knowledge_bases', 'share_knowledge_bases'],
  },
];
