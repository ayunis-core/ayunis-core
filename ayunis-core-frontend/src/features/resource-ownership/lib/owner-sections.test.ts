import { describe, expect, it } from 'vitest';
import type { OwnedResource } from '@/features/resource-ownership/model/types';
import { ownerSections } from './owner-sections';

type Item = OwnedResource & { id: string };

function team(id: string, teamId: string, teamName: string): Item {
  return {
    id,
    ownerType: 'team',
    teamId,
    ownerDescription: {
      teamName,
      audienceCount: 3,
      teamEditors: [],
      orgEditorsIncludeNonAdmins: false,
      submittedBy: null,
    },
  };
}

describe('ownerSections', () => {
  it('lists teams alphabetically, then the organisation, keeping item order', () => {
    const sections = ownerSections<Item>([
      { id: 'org-1', ownerType: 'org' },
      team('b-1', 'b', 'Bürgerservice'),
      team('a-1', 'a', 'Bauamt'),
      team('b-2', 'b', 'Bürgerservice'),
    ]);

    expect(
      sections.map(({ teamName, items }) => [
        teamName,
        items.map(({ id }) => id),
      ]),
    ).toEqual([
      ['Bauamt', ['a-1']],
      ['Bürgerservice', ['b-1', 'b-2']],
      [null, ['org-1']],
    ]);
  });

  it('leaves out empty sections and items of other owners', () => {
    expect(ownerSections<Item>([{ id: 'own', ownerType: 'personal' }])).toEqual(
      [],
    );
  });
});
