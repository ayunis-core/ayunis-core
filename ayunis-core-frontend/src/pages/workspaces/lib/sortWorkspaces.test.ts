import { describe, expect, it } from 'vitest';
import type { Workspace } from '@/features/workspaces';
import { filterWorkspaces, sortWorkspaces } from './sortWorkspaces';

function aWorkspace(overrides: Partial<Workspace>): Workspace {
  return {
    id: 'id',
    name: 'Workspace',
    description: null,
    icon: 'folder',
    color: 'violet',
    isPinned: false,
    sortOrder: 0,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('sortWorkspaces', () => {
  const older = aWorkspace({
    id: 'older',
    name: 'Ärger',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-05T10:00:00.000Z',
  });
  const newer = aWorkspace({
    id: 'newer',
    name: 'Bauhof',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
  });

  it('puts the most recently updated first', () => {
    expect(
      sortWorkspaces([newer, older], 'updatedAt').map((w) => w.id),
    ).toEqual(['older', 'newer']);
  });

  it('puts the most recently created first', () => {
    expect(
      sortWorkspaces([older, newer], 'createdAt').map((w) => w.id),
    ).toEqual(['newer', 'older']);
  });

  it('sorts alphabetically using the given locale', () => {
    expect(
      sortWorkspaces([newer, older], 'alpha', 'de').map((w) => w.id),
    ).toEqual(['older', 'newer']);
  });

  it('does not mutate the input', () => {
    const input = [newer, older];
    sortWorkspaces(input, 'alpha');
    expect(input.map((w) => w.id)).toEqual(['newer', 'older']);
  });
});

describe('filterWorkspaces', () => {
  const workspaces = [
    aWorkspace({ id: 'a', name: 'Bürgeranfragen' }),
    aWorkspace({ id: 'b', name: 'Feuerwehr' }),
  ];

  it('matches case-insensitively on a substring', () => {
    expect(filterWorkspaces(workspaces, 'FEUER').map((w) => w.id)).toEqual([
      'b',
    ]);
  });

  it('returns everything for a blank search', () => {
    expect(filterWorkspaces(workspaces, '   ')).toHaveLength(2);
  });
});
