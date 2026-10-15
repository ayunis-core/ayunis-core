import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

export type OwnedResourceKind = 'skill' | 'knowledge_base';

export interface OwnershipRights {
  own: Permission;
  org: Permission;
  team: TeamAdminPermission;
}

export const OWNERSHIP_RIGHTS: Record<OwnedResourceKind, OwnershipRights> = {
  skill: {
    own: Permission.MANAGE_OWN_SKILLS,
    org: Permission.MANAGE_ORG_SKILLS,
    team: TeamAdminPermission.TEAM_MANAGE_SKILLS,
  },
  knowledge_base: {
    own: Permission.MANAGE_OWN_KNOWLEDGE,
    org: Permission.MANAGE_ORG_KNOWLEDGE,
    team: TeamAdminPermission.TEAM_MANAGE_KNOWLEDGE,
  },
};
