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
    expect(authorization.canAny('manage_skills', 'share_skills')).toBe(false);
  });
});
