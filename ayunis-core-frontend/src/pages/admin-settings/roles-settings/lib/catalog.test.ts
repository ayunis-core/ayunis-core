import { describe, it, expect } from 'vitest';
import en from '@/shared/locales/en/admin-settings-roles.json';
import de from '@/shared/locales/de/admin-settings-roles.json';
import { ROLE_COLUMNS } from '@/pages/admin-settings/roles-settings/model/types';
import { PERMISSION_SECTIONS, TEAM_ADMIN_PERMISSIONS } from './catalog';

const LOCALES = { en, de };
const ALL_PERMISSIONS = PERMISSION_SECTIONS.flatMap(
  (section) => section.permissions,
);

describe('permission catalog', () => {
  it('lists the groups in matrix order', () => {
    expect(PERMISSION_SECTIONS.map((section) => section.group)).toEqual([
      'teams',
      'skills',
      'knowledge_bases',
      'workspaces',
    ]);
  });

  it('lists every permission once', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });
});

describe.each(Object.entries(LOCALES))('%s translations', (_lang, locale) => {
  it.each(ALL_PERMISSIONS)('names and explains %s', (permission) => {
    const labels: Record<string, string> = locale.permissions;
    const hints: Record<string, string> = locale.permissionHints;

    expect(labels[permission]).toBeTruthy();
    expect(hints[permission]).toBeTruthy();
  });

  it.each(PERMISSION_SECTIONS.map((section) => section.group))(
    'names the %s group',
    (group) => {
      expect(locale.groups[group]).toBeTruthy();
    },
  );

  it.each(TEAM_ADMIN_PERMISSIONS)('names and explains %s', (permission) => {
    const labels: Record<string, string> = locale.teamAdmins.permissions;
    const hints: Record<string, string> = locale.teamAdmins.permissionHints;

    expect(labels[permission]).toBeTruthy();
    expect(hints[permission]).toBeTruthy();
  });

  it('describes the team admin role', () => {
    expect(locale.overview.names.teamAdmin).toBeTruthy();
    expect(locale.overview.roles.teamAdmin).toBeTruthy();
  });

  it.each(ROLE_COLUMNS)('describes the %s role', (role) => {
    expect(locale.columns[role]).toBeTruthy();
    expect(locale.overview.roles[role]).toBeTruthy();
  });
});
