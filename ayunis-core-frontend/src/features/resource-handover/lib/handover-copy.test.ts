import { describe, expect, it } from 'vitest';
import type { HandoverTarget } from '@/features/resource-handover/model/types';
import {
  dialogDescription,
  dialogHint,
  groupTargets,
  orderedTargets,
  reviewerCopy,
  targetCopy,
} from './handover-copy';

const jonas = { userId: 'jonas', name: 'Jonas Weber' };
const marie = { userId: 'marie', name: 'Marie Schulz' };

function team(
  teamName: string,
  overrides: Partial<HandoverTarget> = {},
): HandoverTarget {
  return {
    type: 'team',
    teamId: `team-${teamName}`,
    teamName,
    isOwnTeam: true,
    memberCount: 8,
    appliesImmediately: false,
    reviewers: [],
    ...overrides,
  };
}

const org: HandoverTarget = {
  type: 'org',
  isOwnTeam: false,
  memberCount: 120,
  appliesImmediately: false,
  reviewers: [],
};

describe('dialogDescription', () => {
  it('says the handover applies at once when the viewer may approve it', () => {
    expect(
      dialogDescription(team('Bauamt', { appliesImmediately: true })),
    ).toEqual({
      key: 'dialog.description.direct',
    });
  });

  it('names the only team reviewer', () => {
    expect(dialogDescription(team('Bauamt', { reviewers: [jonas] }))).toEqual({
      key: 'dialog.description.oneReviewer',
      values: { name: 'Jonas Weber' },
    });
  });

  it('falls back to admins for the organisation or teams without reviewers', () => {
    expect(dialogDescription(org)).toEqual({ key: 'dialog.description.admin' });
    expect(dialogDescription(team('Bauamt'))).toEqual({
      key: 'dialog.description.admin',
    });
  });

  it('speaks of team admins when several may review', () => {
    expect(
      dialogDescription(team('Bauamt', { reviewers: [jonas, marie] })),
    ).toEqual({ key: 'dialog.description.teamAdmins' });
  });
});

describe('dialogHint', () => {
  const options = {
    targets: [team('Bauamt'), team('Kämmerei'), org],
    orgEditorsIncludeNonAdmins: false,
    unlinksResources: false,
  };

  it('explains a team request, its audience and the organisation alternative', () => {
    expect(dialogHint(team('Bauamt'), options)).toEqual([
      { key: 'dialog.hint.requestTeam' },
      { key: 'dialog.hint.audienceTeam', values: { count: 8 } },
      { key: 'dialog.hint.severalTeams' },
    ]);
  });

  it('names the new owner of a direct handover', () => {
    expect(
      dialogHint(team('Bauamt', { appliesImmediately: true }), {
        ...options,
        targets: [team('Bauamt')],
      }),
    ).toEqual([
      { key: 'dialog.hint.directTeam', values: { team: 'Bauamt' } },
      { key: 'dialog.hint.audienceTeam', values: { count: 8 } },
    ]);
  });

  it('mentions everyone with the right when non-admins edit organisation items', () => {
    expect(
      dialogHint(org, { ...options, orgEditorsIncludeNonAdmins: true })[0],
    ).toEqual({ key: 'dialog.hint.requestOrgWithRight' });
  });

  it('warns that links of a skill are removed', () => {
    expect(
      dialogHint(org, { ...options, unlinksResources: true }).at(-1),
    ).toEqual({ key: 'dialog.hint.unlinks' });
  });
});

describe('reviewerCopy', () => {
  it('names one reviewer, otherwise team admins or admins', () => {
    const target = team('Bauamt');
    expect(reviewerCopy(target, [jonas])).toEqual({
      key: 'status.person',
      values: { name: 'Jonas Weber' },
    });
    expect(reviewerCopy(target, [jonas, marie])).toEqual({
      key: 'status.teamAdmin',
    });
    expect(reviewerCopy(target, [])).toEqual({ key: 'status.admin' });
    expect(reviewerCopy(org, [jonas])).toEqual({ key: 'status.admin' });
  });
});

describe('targetCopy', () => {
  it('builds team and organisation labels', () => {
    expect(targetCopy('owner', team('Bauamt'))).toEqual({
      key: 'target.owner.team',
      values: { team: 'Bauamt' },
    });
    expect(targetCopy('to', org)).toEqual({ key: 'target.to.org' });
  });
});

describe('groupTargets', () => {
  it('orders own teams, then other teams, then the organisation', () => {
    const groups = groupTargets([
      org,
      team('Kämmerei', { isOwnTeam: false }),
      team('Bürgerservice'),
      team('Bauamt'),
    ]);
    expect(
      orderedTargets(groups).map((target) => target.teamName ?? 'org'),
    ).toEqual(['Bauamt', 'Bürgerservice', 'Kämmerei', 'org']);
    expect(groups.other).toHaveLength(1);
  });
});
