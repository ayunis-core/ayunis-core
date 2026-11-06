import type { UUID } from 'crypto';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

/** A team or the organization owning a resource (e.g. a skill). */
export type CollectiveOwner =
  { type: 'team'; teamId: UUID } | { type: 'org'; orgId: UUID };

/**
 * Managing takes the organization-wide `manage` permission plus the
 * permission for the owner kind.
 */
export interface CollectiveOwnerPermissions {
  manage: Permission;
  team: Permission;
  org: Permission;
}

export interface CollectiveOwnerAccess {
  canRead: boolean;
  canManage: boolean;
}

/** The team and organization owners whose resources a user can read. */
export interface ReadableCollectiveOwners {
  orgId: UUID;
  teamIds: UUID[];
}
