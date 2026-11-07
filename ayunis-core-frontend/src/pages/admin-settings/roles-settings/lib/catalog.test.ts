import { describe, it, expect } from 'vitest';
import en from '@/shared/locales/en/admin-settings-roles.json';
import de from '@/shared/locales/de/admin-settings-roles.json';
import { PERMISSION_SECTIONS, visiblePermissionSections } from './catalog';

const LOCALES = { en, de };
const ALL_PERMISSIONS = PERMISSION_SECTIONS.flatMap(
  (section) => section.permissions,
);

describe.each(Object.entries(LOCALES))('%s translations', (_lang, locale) => {
  it.each(ALL_PERMISSIONS)('explains %s', (permission) => {
    expect(locale.permissionHints[permission]).toBeTruthy();
  });

  it.each(Object.keys(locale.columns).filter((c) => c !== 'permission'))(
    'explains the %s role',
    (role) => {
      expect(
        locale.roleHints[role as keyof typeof locale.roleHints],
      ).toBeTruthy();
    },
  );
});

describe('visiblePermissionSections', () => {
  const groups = (routinesEnabled: boolean) =>
    visiblePermissionSections({ routinesEnabled }).map(
      (section) => section.group,
    );

  it('shows the routines group while routines are enabled', () => {
    expect(groups(true)).toEqual([
      'teams',
      'skills',
      'knowledge_bases',
      'routines',
    ]);
  });

  it('hides the routines group while routines are disabled', () => {
    expect(groups(false)).toEqual(['teams', 'skills', 'knowledge_bases']);
  });
});
