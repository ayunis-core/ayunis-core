import { describe, expect, it } from 'vitest';
import type {
  OwnerOption,
  OwnerSelection,
} from '@/features/resource-ownership/model/types';
import { ownerKey } from './ownership';
import { groupOwnerOptions } from './owner-option-groups';

const option = (selection: OwnerSelection): OwnerOption => ({
  key: ownerKey(selection),
  selection,
  label: ownerKey(selection),
});

const groupsOf = (options: OwnerOption[]) =>
  groupOwnerOptions(options).map((group) => ({
    key: group.key,
    keys: group.options.map(({ key }) => key),
  }));

describe('groupOwnerOptions', () => {
  it('separates the personal owner from the organisation and teams, keeping their order', () => {
    expect(
      groupsOf([
        option({ ownerType: 'personal' }),
        option({ ownerType: 'org' }),
        option({ ownerType: 'team', teamId: 'sales' }),
        option({ ownerType: 'team', teamId: 'support' }),
      ]),
    ).toEqual([
      { key: 'personal', keys: ['personal'] },
      { key: 'orgAndTeams', keys: ['org', 'team:sales', 'team:support'] },
    ]);
  });

  it('omits a group without options instead of rendering an empty heading', () => {
    expect(groupsOf([option({ ownerType: 'personal' })])).toEqual([
      { key: 'personal', keys: ['personal'] },
    ]);
  });
});
