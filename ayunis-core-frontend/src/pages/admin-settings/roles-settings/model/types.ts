import type { RolePermissionSetDtoPermissionsItem } from '@/shared/api';

export type Permission = RolePermissionSetDtoPermissionsItem;

// Display-only grouping: the API returns grants keyed on Permission and has no
// opinion on how the settings matrix is sectioned.
export type PermissionGroup = 'teams' | 'skills' | 'knowledge_bases';

export const EDITABLE_ROLES = ['manager', 'user'] as const;
export type EditableRole = (typeof EDITABLE_ROLES)[number];

export type RolePermissionsDraft = Record<EditableRole, Set<Permission>>;
