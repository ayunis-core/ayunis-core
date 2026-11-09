import { describe, expect, it } from 'vitest';
import type { OwnedResource } from '@/features/resource-ownership/model/types';
import { groupByOwner } from './owner-sections';

type Item = OwnedResource & { id: string; name: string };

const teams = [
  { id: 'zoning', name: 'Zoning' },
  { id: 'archive', name: 'Archive' },
];

const item = (
  id: string,
  owner: Omit<OwnedResource, 'isShared'>,
  isShared = false,
): Item => ({
  id,
  name: id,
  isShared,
  ...owner,
});

const sectionsOf = (items: Item[]) =>
  groupByOwner(items, teams).map((section) => ({
    key: section.key,
    ids: section.items.map(({ id }) => id),
  }));

describe('groupByOwner', () => {
  it('orders personal, organisation, teams by name, then items shared with the user', () => {
    expect(
      sectionsOf([
        item('shared', { ownerType: 'personal' }, true),
        item('zoning-skill', { ownerType: 'team', teamId: 'zoning' }),
        item('org-skill', { ownerType: 'org' }),
        item('archive-skill', { ownerType: 'team', teamId: 'archive' }),
        item('own', { ownerType: 'personal' }),
      ]),
    ).toEqual([
      { key: 'personal', ids: ['own'] },
      { key: 'org', ids: ['org-skill'] },
      { key: 'team:archive', ids: ['archive-skill'] },
      { key: 'team:zoning', ids: ['zoning-skill'] },
      { key: 'shared', ids: ['shared'] },
    ]);
  });

  it('leaves out owners without items, personal included', () => {
    expect(
      sectionsOf([
        item('zoning-skill', { ownerType: 'team', teamId: 'zoning' }),
      ]),
    ).toEqual([{ key: 'team:zoning', ids: ['zoning-skill'] }]);
  });

  it('sorts the items of a section by name', () => {
    expect(
      sectionsOf([
        { ...item('b', { ownerType: 'org' }), name: 'Bauantrag' },
        { ...item('a', { ownerType: 'org' }), name: 'Abwasser' },
      ]),
    ).toEqual([{ key: 'org', ids: ['a', 'b'] }]);
  });
});
