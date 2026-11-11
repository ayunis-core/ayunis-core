export type MemberRole = 'user' | 'manager' | 'admin';

export interface MemberRolePermissionSet {
  role: MemberRole;
  permissions: readonly string[];
}

/**
 * Where the select's copy lives. Below `keyPrefix` the namespace must provide
 * `roles.<role>`, `card.intro`, `card.none`, `card.footer`, `card.adminFooter`
 * and `card.items.<permission>` for every listed permission.
 */
export interface MemberRoleTranslation {
  namespace: string;
  keyPrefix: string;
}
