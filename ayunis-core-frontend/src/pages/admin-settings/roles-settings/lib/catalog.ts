import type { FeatureTogglesResponseDto } from '@/shared/api';
import type {
  Permission,
  PermissionGroup,
} from '@/pages/admin-settings/roles-settings/model/types';

export interface PermissionGroupSection {
  group: PermissionGroup;
  permissions: Permission[];
  /** Shown only while this feature is enabled. */
  feature?: keyof FeatureTogglesResponseDto;
}

// Section order and membership for the permission matrix. Labels for both the
// group and each permission come from the `admin-settings-roles` namespace.
export const PERMISSION_SECTIONS: readonly PermissionGroupSection[] = [
  { group: 'teams', permissions: ['manage_teams', 'assign_users_to_teams'] },
  {
    group: 'skills',
    permissions: [
      'manage_skills',
      'share_skills_with_teams',
      'share_skills_with_org',
    ],
  },
  {
    group: 'knowledge_bases',
    permissions: [
      'manage_knowledge_bases',
      'share_knowledge_bases_with_teams',
      'share_knowledge_bases_with_org',
    ],
  },
  {
    group: 'routines',
    permissions: ['manage_routines'],
    feature: 'routinesEnabled',
  },
  {
    group: 'recordings',
    permissions: [
      'manage_recordings',
      'manage_team_recordings',
      'manage_org_recordings',
    ],
    feature: 'recordingsEnabled',
  },
];

export function visiblePermissionSections(
  toggles: Partial<FeatureTogglesResponseDto> | undefined,
): PermissionGroupSection[] {
  return PERMISSION_SECTIONS.filter(
    (section) => !section.feature || toggles?.[section.feature] === true,
  );
}
