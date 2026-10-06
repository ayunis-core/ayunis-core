import { describe, expect, it } from 'vitest';
import type { Favorite } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';
import { groupFavoriteWorkspaces } from './groupFavoriteWorkspaces';

function workspace(id: string): Workspace {
  return { id, name: id } as Workspace;
}

function favorite(
  referenceId: string,
  position: number,
  referenceType: 'workspace' | 'thread' = 'workspace',
): Favorite {
  return {
    id: `fav-${referenceId}`,
    referenceId,
    referenceType,
    position,
  } as Favorite;
}

const ids = (items: Workspace[]) => items.map((item) => item.id);

describe('groupFavoriteWorkspaces', () => {
  const workspaces = [
    workspace('a'),
    workspace('b'),
    workspace('c'),
    workspace('d'),
  ];

  it('keeps every workspace in "others" when nothing is a favorite', () => {
    const groups = groupFavoriteWorkspaces(workspaces, []);

    expect(ids(groups.favorites)).toEqual([]);
    expect(ids(groups.others)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('lists favorites in their sidebar order and each workspace only once', () => {
    const groups = groupFavoriteWorkspaces(workspaces, [
      favorite('c', 1),
      favorite('a', 0),
    ]);

    expect(ids(groups.favorites)).toEqual(['a', 'c']);
    expect(ids(groups.others)).toEqual(['b', 'd']);
  });

  it('ignores favorite chats and favorites of workspaces not in the list', () => {
    const groups = groupFavoriteWorkspaces(workspaces, [
      favorite('b', 0, 'thread'),
      favorite('gone', 1),
      favorite('d', 2),
    ]);

    expect(ids(groups.favorites)).toEqual(['d']);
    expect(ids(groups.others)).toEqual(['a', 'b', 'c']);
  });
});
