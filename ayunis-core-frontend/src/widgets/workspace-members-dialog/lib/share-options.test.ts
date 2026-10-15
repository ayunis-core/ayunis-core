import { describe, expect, it } from 'vitest';
import type { ShareCandidatesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  filterOptionGroups,
  shareOptionGroups,
  withoutCoveredPeople,
  type ShareOption,
  type ShareOptionCopy,
} from './share-options';

const copy: ShareOptionCopy = {
  organizationGroup: 'Organisation',
  teamsGroup: 'Teams',
  noTeamGroup: 'Ohne Team',
  organization: 'Gesamte Organisation',
  team: (name) => `Team ${name}`,
  people: (count) => `${count} Personen`,
};

const candidates: ShareCandidatesResponseDto = {
  organization: { memberCount: 80 },
  teams: [
    {
      teamId: 'bauamt',
      name: 'Bauamt',
      memberCount: 2,
      memberIds: ['lena', 'jonas'],
    },
  ],
  people: [
    {
      userId: 'lena',
      name: 'Lena',
      primaryTeam: { id: 'bauamt', name: 'Bauamt' },
    },
    { userId: 'sabine', name: 'Sabine', primaryTeam: null },
    {
      userId: 'jonas',
      name: 'Jonas',
      primaryTeam: { id: 'bauamt', name: 'Bauamt' },
    },
  ],
};

function option(groups: ReturnType<typeof shareOptionGroups>, value: string) {
  const found = groups
    .flatMap(({ items }) => items)
    .find((item) => item.value === value);
  if (!found) throw new Error(`missing ${value}`);
  return found;
}

describe('shareOptionGroups', () => {
  it('keeps teams named like a section in their own group', () => {
    const groups = shareOptionGroups(
      {
        organization: null,
        teams: [],
        people: [
          {
            userId: 'tina',
            name: 'Tina',
            primaryTeam: { id: 'teams-team', name: 'Teams' },
          },
          {
            userId: 'otto',
            name: 'Otto',
            primaryTeam: { id: 'no-team-team', name: 'Ohne Team' },
          },
          { userId: 'sabine', name: 'Sabine', primaryTeam: null },
        ],
      },
      [],
      copy,
    );

    expect(
      groups.map(({ label, items }) => [
        label,
        items.map(({ value }) => value),
      ]),
    ).toEqual([
      ['Ohne Team', ['otto']],
      ['Teams', ['tina']],
      ['Ohne Team', ['sabine']],
    ]);
  });

  it('orders organisation, teams, people by primary team, then people without a team', () => {
    const groups = shareOptionGroups(candidates, [], copy);

    expect(groups.map(({ label }) => label)).toEqual([
      'Organisation',
      'Teams',
      'Bauamt',
      'Ohne Team',
    ]);
    expect(groups[2].items.map(({ label }) => label)).toEqual([
      'Jonas',
      'Lena',
    ]);
    expect(option(groups, 'organization')).toMatchObject({
      detail: '80 Personen',
    });
  });

  it('drops the members of a chosen team from the options and the selection', () => {
    const groups = shareOptionGroups(candidates, [], copy);
    const team = option(groups, 'bauamt');
    const lena = option(groups, 'lena');

    expect(withoutCoveredPeople([lena, team])).toEqual([team]);
    const remaining = shareOptionGroups(candidates, [team], copy)
      .flatMap(({ items }) => items)
      .map(({ value }) => value);
    expect(remaining).not.toContain('lena');
    expect(remaining).toContain('sabine');
  });

  it('keeps only the organisation once it is chosen', () => {
    const groups = shareOptionGroups(candidates, [], copy);
    const organization = option(groups, 'organization');
    const sabine = option(groups, 'sabine');

    expect(withoutCoveredPeople([sabine, organization])).toEqual([
      organization,
    ]);
    expect(shareOptionGroups(candidates, [organization], copy)).toEqual([]);
  });
});

describe('filterOptionGroups', () => {
  it('searches names and group names', () => {
    const groups = shareOptionGroups(candidates, [], copy);
    const labels = (query: string) =>
      filterOptionGroups(groups, query)
        .flatMap(({ items }) => items)
        .map(({ label }: ShareOption) => label);

    expect(labels('sab')).toEqual(['Sabine']);
    expect(labels('bauamt')).toEqual(['Team Bauamt', 'Jonas', 'Lena']);
  });
});
