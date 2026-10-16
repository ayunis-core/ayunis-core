import type {
  Permission,
  PermissionGroup,
} from '@/pages/admin-settings/roles-settings/model/types';
import type { TeamAdminPermission } from '@/features/permissions';

export interface PermissionGroupSection {
  group: PermissionGroup;
  permissions: Permission[];
}

// Section order and membership for the permission matrix. Labels for both the
// group and each permission come from the `admin-settings-roles` namespace.
export const PERMISSION_SECTIONS: readonly PermissionGroupSection[] = [
  { group: 'teams', permissions: ['manage_teams', 'assign_users_to_teams'] },
  {
    group: 'skills',
    permissions: [
      'manage_own_skills',
      'manage_org_skills',
      'install_marketplace_skills',
      'request_skill_transfer',
      'request_skill_transfer_other_teams',
      'request_skill_transfer_org',
      'review_all_skill_requests',
    ],
  },
  {
    group: 'knowledge_bases',
    permissions: [
      'manage_own_knowledge',
      'manage_org_knowledge',
      'request_knowledge_transfer',
      'request_knowledge_transfer_other_teams',
      'request_knowledge_transfer_org',
      'review_all_knowledge_requests',
    ],
  },
  {
    group: 'workspaces',
    permissions: [
      'create_workspaces',
      'share_workspaces',
      'share_workspaces_org',
    ],
  },
];

export const NEW_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  'manage_org_skills',
  'manage_org_knowledge',
  'install_marketplace_skills',
  'request_skill_transfer',
  'request_skill_transfer_other_teams',
  'request_skill_transfer_org',
  'review_all_skill_requests',
  'request_knowledge_transfer',
  'request_knowledge_transfer_other_teams',
  'request_knowledge_transfer_org',
  'review_all_knowledge_requests',
  'create_workspaces',
  'share_workspaces',
  'share_workspaces_org',
]);

export const TEAM_ADMIN_PERMISSIONS: readonly TeamAdminPermission[] = [
  'team_manage_members',
  'team_appoint_admins',
  'team_manage_skills',
  'team_manage_knowledge',
  'team_review_requests',
  'team_share_workspaces',
];
