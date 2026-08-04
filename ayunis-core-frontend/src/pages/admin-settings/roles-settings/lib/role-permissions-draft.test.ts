import { describe, it, expect } from 'vitest';
import {
  toggleDraft,
  permissionSetsEqual,
  hasEmptyRoleSelection,
  changedRoles,
} from './role-permissions-draft';
import type { Permission, RolePermissionsDraft } from '../model/types';

const P = (p: string) => p as Permission;
const draft = (manager: string[], user: string[]): RolePermissionsDraft => ({
  manager: new Set(manager.map(P)),
  user: new Set(user.map(P)),
});

describe('permissionSetsEqual', () => {
  it('is true for the same members regardless of order', () => {
    expect(
      permissionSetsEqual(
        new Set(['a', 'b'].map(P)),
        new Set(['b', 'a'].map(P)),
      ),
    ).toBe(true);
  });

  it('is false for a different size or members', () => {
    expect(
      permissionSetsEqual(new Set(['a'].map(P)), new Set(['a', 'b'].map(P))),
    ).toBe(false);
    expect(
      permissionSetsEqual(new Set(['a'].map(P)), new Set(['b'].map(P))),
    ).toBe(false);
  });
});

describe('hasEmptyRoleSelection', () => {
  it('is true when any editable role has no permissions', () => {
    expect(hasEmptyRoleSelection(draft([], ['a']))).toBe(true);
    expect(hasEmptyRoleSelection(draft(['a'], []))).toBe(true);
  });

  it('is false when every editable role has at least one', () => {
    expect(hasEmptyRoleSelection(draft(['a'], ['b']))).toBe(false);
  });
});

describe('changedRoles', () => {
  const server = draft(['a', 'b'], ['a']);

  it('returns only the roles whose set differs, in EDITABLE_ROLES order', () => {
    expect(changedRoles(draft(['a'], ['a']), server)).toEqual(['manager']);
    expect(changedRoles(draft(['a', 'b'], ['a', 'b']), server)).toEqual([
      'user',
    ]);
    expect(changedRoles(draft(['x'], ['y']), server)).toEqual([
      'manager',
      'user',
    ]);
  });

  it('returns empty when nothing changed', () => {
    expect(changedRoles(draft(['a', 'b'], ['a']), server)).toEqual([]);
  });
});

describe('toggleDraft', () => {
  it('adds a missing permission without mutating the original', () => {
    const original = draft(['a'], ['a']);
    const next = toggleDraft(original, 'manager', P('b'));
    expect([...next.manager]).toEqual(['a', 'b']);
    expect([...original.manager]).toEqual(['a']);
  });

  it('removes a present permission', () => {
    const next = toggleDraft(draft(['a'], ['a']), 'manager', P('a'));
    expect([...next.manager]).toEqual([]);
  });
});
