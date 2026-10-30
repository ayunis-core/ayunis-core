import { describe, expect, it } from 'vitest';
import { reorderVisibleEntries } from './reorder-visible-entries';

const entry = (modelId: string) => ({ modelId, enabled: true });
const ids = (entries: { modelId: string }[]) => entries.map((e) => e.modelId);

describe(reorderVisibleEntries.name, () => {
  it('keeps a hidden archived entry at its index when visible ones move', () => {
    const entries = [entry('a'), entry('archived'), entry('b')];
    expect(
      ids(reorderVisibleEntries(entries, ['a', 'b'], 'b', 'a') ?? []),
    ).toEqual(['b', 'archived', 'a']);
  });

  it('reorders a list without hidden entries like a plain move', () => {
    const entries = [entry('a'), entry('b'), entry('c')];
    expect(
      ids(reorderVisibleEntries(entries, ['a', 'b', 'c'], 'a', 'c') ?? []),
    ).toEqual(['b', 'c', 'a']);
  });

  it('keeps each entry with its enabled flag', () => {
    const entries = [{ modelId: 'a', enabled: false }, entry('b')];
    expect(reorderVisibleEntries(entries, ['a', 'b'], 'a', 'b')).toEqual([
      entry('b'),
      { modelId: 'a', enabled: false },
    ]);
  });

  it('returns null when nothing moves', () => {
    expect(reorderVisibleEntries([entry('a')], ['a'], 'a', 'a')).toBeNull();
  });
});
