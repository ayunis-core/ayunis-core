import type { UUID } from 'crypto';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import type { CollectiveOwner } from './collective-owner';
import {
  OWNERSHIP_RIGHTS,
  type OwnedResourceKind,
} from './owned-resource-kind';

export interface OwnershipViewerParams {
  userId: UUID;
  orgId: UUID;
  isAdmin: boolean;
  permissions: Iterable<Permission>;
  memberTeamIds: Iterable<UUID>;
  adminTeamIds: Iterable<UUID>;
  teamAdminPermissions: Iterable<TeamAdminPermission>;
}

export class OwnershipViewer {
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly isAdmin: boolean;
  private readonly permissions: ReadonlySet<Permission>;
  private readonly memberTeamIds: ReadonlySet<UUID>;
  private readonly adminTeamIds: ReadonlySet<UUID>;
  private readonly teamAdminPermissions: ReadonlySet<TeamAdminPermission>;

  constructor(params: OwnershipViewerParams) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.isAdmin = params.isAdmin;
    this.permissions = new Set(params.permissions);
    this.memberTeamIds = new Set(params.memberTeamIds);
    this.adminTeamIds = new Set(params.adminTeamIds);
    this.teamAdminPermissions = new Set(params.teamAdminPermissions);
  }

  get teamIds(): UUID[] {
    return [...this.memberTeamIds];
  }

  has(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  isMemberOf(teamId: UUID): boolean {
    return this.memberTeamIds.has(teamId);
  }

  hasTeamAdminRight(teamId: UUID, right: TeamAdminPermission): boolean {
    return (
      this.adminTeamIds.has(teamId) && this.teamAdminPermissions.has(right)
    );
  }

  hasTeamAdminRightAnywhere(right: TeamAdminPermission): boolean {
    return this.adminTeamIds.size > 0 && this.teamAdminPermissions.has(right);
  }

  canManageOwn(kind: OwnedResourceKind): boolean {
    return this.has(OWNERSHIP_RIGHTS[kind].own);
  }

  canUse(owner: CollectiveOwner): boolean {
    if (owner.orgId !== this.orgId) return false;
    return owner.type === 'org' || this.memberTeamIds.has(owner.teamId);
  }

  canManage(kind: OwnedResourceKind, owner: CollectiveOwner): boolean {
    if (owner.orgId !== this.orgId) return false;
    if (owner.type === 'org') return this.has(OWNERSHIP_RIGHTS[kind].org);
    return this.isAdmin || this.isTeamEditor(kind, owner.teamId);
  }

  canRead(kind: OwnedResourceKind, owner: CollectiveOwner): boolean {
    return this.canUse(owner) || this.canManage(kind, owner);
  }

  mayCreateFor(kind: OwnedResourceKind, owner: CollectiveOwner): boolean {
    if (owner.orgId !== this.orgId) return false;
    if (owner.type === 'org') return this.has(OWNERSHIP_RIGHTS[kind].org);
    return this.isTeamEditor(kind, owner.teamId);
  }

  editableTeamIds(kind: OwnedResourceKind): UUID[] {
    return [...this.adminTeamIds].filter((teamId) =>
      this.isTeamEditor(kind, teamId),
    );
  }

  private isTeamEditor(kind: OwnedResourceKind, teamId: UUID): boolean {
    return this.hasTeamAdminRight(teamId, OWNERSHIP_RIGHTS[kind].team);
  }
}
