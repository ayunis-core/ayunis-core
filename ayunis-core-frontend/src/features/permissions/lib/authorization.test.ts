import { describe, expect, it } from 'vitest';
import { MeResponseDtoRole } from '@/shared/api';
import { createAuthorization } from './authorization';

describe('createAuthorization', () => {
  it('recognizes the current role', () => {
    const authorization = createAuthorization(MeResponseDtoRole.admin);

    expect(authorization.hasRole(MeResponseDtoRole.admin)).toBe(true);
    expect(authorization.hasRole(MeResponseDtoRole.manager)).toBe(false);
  });

  it('denies every role while the current role is unavailable', () => {
    const authorization = createAuthorization(undefined);

    expect(authorization.hasRole(MeResponseDtoRole.admin)).toBe(false);
  });

  it('recognizes a granted permission', () => {
    const authorization = createAuthorization(MeResponseDtoRole.manager, [
      'manage_teams',
    ]);

    expect(authorization.can('manage_teams')).toBe(true);
    expect(authorization.can('manage_skills')).toBe(false);
  });

  it('recognizes any one of several granted permissions', () => {
    const authorization = createAuthorization(MeResponseDtoRole.manager, [
      'assign_users_to_teams',
    ]);

    expect(authorization.canAny('manage_teams', 'assign_users_to_teams')).toBe(
      true,
    );
    expect(authorization.canAny('manage_skills', 'share_skills_with_org')).toBe(
      false,
    );
  });

  describe('team access', () => {
    const teams = [
      {
        id: 'admin-team',
        role: 'admin' as const,
        permissions: ['assign_users_to_teams' as const],
      },
      {
        id: 'member-team',
        role: 'user' as const,
        permissions: ['manage_skills' as const],
      },
    ];

    it('adds what the team role grants in that team only', () => {
      const authorization = createAuthorization(
        MeResponseDtoRole.user,
        ['manage_skills'],
        teams,
      );

      expect(
        authorization.canInTeam('admin-team', 'assign_users_to_teams'),
      ).toBe(true);
      expect(
        authorization.canInTeam('member-team', 'assign_users_to_teams'),
      ).toBe(false);
      expect(authorization.can('assign_users_to_teams')).toBe(false);
      expect(authorization.canAnyInSomeTeam('assign_users_to_teams')).toBe(
        true,
      );
    });

    it('lets team admins and org-wide member managers manage team roles', () => {
      const teamAdmin = createAuthorization(MeResponseDtoRole.user, [], teams);
      const orgAssigner = createAuthorization(MeResponseDtoRole.manager, [
        'assign_users_to_teams',
      ]);

      expect(teamAdmin.canManageTeamRoles('admin-team')).toBe(true);
      expect(teamAdmin.canManageTeamRoles('member-team')).toBe(false);
      expect(orgAssigner.canManageTeamRoles('member-team')).toBe(true);
    });
  });
});
