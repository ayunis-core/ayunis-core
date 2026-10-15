import { randomUUID } from 'crypto';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

const userId = randomUUID();
const orgId = randomUUID();
const teamId = randomUUID();

describe('OwnershipViewer', () => {
  it('offers only teams the viewer administers with the matching team right', () => {
    const otherTeamId = randomUUID();
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      adminTeamIds: [teamId, otherTeamId],
      teamAdminPermissions: [TeamAdminPermission.TEAM_MANAGE_SKILLS],
    });

    expect(viewer.editableTeamIds('skill')).toEqual([teamId, otherTeamId]);
    expect(viewer.editableTeamIds('knowledge_base')).toEqual([]);
  });

  it('does not let admins create for teams they do not administer', () => {
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      isAdmin: true,
      permissions: Object.values(Permission),
    });
    const team = { type: 'team' as const, teamId, orgId };

    expect(viewer.mayCreateFor('skill', team)).toBe(false);
    expect(viewer.canManage('skill', team)).toBe(true);
    expect(viewer.canUse(team)).toBe(false);
  });

  it('keeps the organisation right separate per resource', () => {
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      permissions: [Permission.MANAGE_ORG_SKILLS],
    });
    const org = { type: 'org' as const, orgId };

    expect(viewer.canManage('skill', org)).toBe(true);
    expect(viewer.canManage('knowledge_base', org)).toBe(false);
    expect(viewer.canUse(org)).toBe(true);
  });

  it('denies every owner of another organisation', () => {
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      isAdmin: true,
      memberTeamIds: [teamId],
      adminTeamIds: [teamId],
      permissions: Object.values(Permission),
      teamAdminPermissions: Object.values(TeamAdminPermission),
    });
    const foreignOrgId = randomUUID();

    expect(viewer.canRead('skill', { type: 'org', orgId: foreignOrgId })).toBe(
      false,
    );
    expect(
      viewer.canRead('skill', { type: 'team', teamId, orgId: foreignOrgId }),
    ).toBe(false);
  });
});
