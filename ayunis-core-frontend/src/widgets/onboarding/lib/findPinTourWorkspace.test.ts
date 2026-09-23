import { describe, expect, it } from 'vitest';
import type { Favorite } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';
import { findPinTourWorkspace } from './findPinTourWorkspace';

const workspace = (id: string) => ({ id }) as Workspace;
const favoriteOf = (id: string) =>
  ({ referenceId: id, referenceType: 'workspace' }) as unknown as Favorite;

describe('findPinTourWorkspace', () => {
  it('returns the first workspace that is not yet a favorite', () => {
    const workspaces = [workspace('a'), workspace('b'), workspace('c')];
    expect(findPinTourWorkspace(workspaces, [favoriteOf('a')])?.id).toBe('b');
  });

  it('treats unknown favorites as no favorites', () => {
    expect(findPinTourWorkspace([workspace('a')], undefined)?.id).toBe('a');
  });

  it('only considers the first page of the list', () => {
    const workspaces = Array.from({ length: 21 }, (_, i) => workspace(`w${i}`));
    const firstPagePinned = workspaces
      .slice(0, 20)
      .map((w) => favoriteOf(w.id));
    expect(findPinTourWorkspace(workspaces, firstPagePinned)).toBeUndefined();
  });

  it('ignores favorites of another reference type', () => {
    const skillFavorite = {
      referenceId: 'a',
      referenceType: 'skill',
    } as unknown as Favorite;
    expect(findPinTourWorkspace([workspace('a')], [skillFavorite])?.id).toBe(
      'a',
    );
  });
});
