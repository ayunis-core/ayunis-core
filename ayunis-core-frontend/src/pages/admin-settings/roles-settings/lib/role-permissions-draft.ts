import type { RolePermissionSetDto } from '@/shared/api';
import { EDITABLE_ROLES } from '../model/types';
import type {
  EditableRole,
  Permission,
  RolePermissionsDraft,
} from '../model/types';

export function buildDraft(
  roles: RolePermissionSetDto[],
): RolePermissionsDraft {
  const draft: RolePermissionsDraft = {
    manager: new Set<Permission>(),
    user: new Set<Permission>(),
  };
  for (const set of roles) {
    if (set.role === 'manager' || set.role === 'user') {
      draft[set.role] = new Set(set.permissions);
    }
  }
  return draft;
}

export function toggleDraft(
  draft: RolePermissionsDraft,
  role: EditableRole,
  permission: Permission,
): RolePermissionsDraft {
  const next: RolePermissionsDraft = {
    manager: new Set(draft.manager),
    user: new Set(draft.user),
  };
  if (next[role].has(permission)) {
    next[role].delete(permission);
  } else {
    next[role].add(permission);
  }
  return next;
}

export function permissionSetsEqual(
  a: Set<Permission>,
  b: Set<Permission>,
): boolean {
  return a.size === b.size && [...a].every((permission) => b.has(permission));
}

// A role must keep at least one permission; used to block an empty save.
export function hasEmptyRoleSelection(rows: RolePermissionsDraft): boolean {
  return EDITABLE_ROLES.some((role) => rows[role].size === 0);
}

// The editable roles whose draft differs from the saved server state.
export function changedRoles(
  rows: RolePermissionsDraft,
  serverDraft: RolePermissionsDraft,
): EditableRole[] {
  return EDITABLE_ROLES.filter(
    (role) => !permissionSetsEqual(rows[role], serverDraft[role]),
  );
}
