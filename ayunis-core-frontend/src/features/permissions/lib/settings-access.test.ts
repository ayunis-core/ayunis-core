import { describe, expect, it } from 'vitest';
import { MeResponseDtoRole } from '@/shared/api';
import { createAuthorization } from './authorization';
import { allowedSettingsSections } from './settings-access';

describe('allowedSettingsSections', () => {
  it('allows an admin to reach every settings section', () => {
    const authorization = createAuthorization(MeResponseDtoRole.admin);

    expect(allowedSettingsSections(authorization)).toEqual(['/admin-settings']);
  });

  it('allows a manager to reach permission-backed settings sections', () => {
    const authorization = createAuthorization(MeResponseDtoRole.manager, [
      'assign_users_to_teams',
    ]);

    expect(allowedSettingsSections(authorization)).toEqual([
      '/admin-settings/teams',
    ]);
  });

  it('denies a user without a settings permission', () => {
    const authorization = createAuthorization(MeResponseDtoRole.user, [
      'manage_skills',
    ]);

    expect(allowedSettingsSections(authorization)).toEqual([]);
  });
});
