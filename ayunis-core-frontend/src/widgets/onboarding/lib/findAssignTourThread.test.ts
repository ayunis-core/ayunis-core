import { describe, expect, it } from 'vitest';
import type { Favorite } from '@/features/favorites';
import { findAssignTourThread } from './findAssignTourThread';

const pinned = (id: string) =>
  ({ referenceId: id, referenceType: 'thread' }) as unknown as Favorite;

describe('findAssignTourThread', () => {
  it('returns the first chat that is not pinned', () => {
    const threads = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(findAssignTourThread(threads, [pinned('a')])?.id).toBe('b');
  });

  it('returns nothing when every chat is pinned', () => {
    const threads = [{ id: 'a' }, { id: 'b' }];
    expect(
      findAssignTourThread(threads, [pinned('a'), pinned('b')]),
    ).toBeUndefined();
  });

  it('ignores favourites of another reference type', () => {
    const workspaceFavorite = {
      referenceId: 'a',
      referenceType: 'workspace',
    } as unknown as Favorite;
    expect(findAssignTourThread([{ id: 'a' }], [workspaceFavorite])?.id).toBe(
      'a',
    );
  });
});
