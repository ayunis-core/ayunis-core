import { randomUUID, type UUID } from 'crypto';
import { WorkspaceSharing, type TeamMembership } from './workspace-sharing';

const owner = randomUUID();
const lena = randomUUID();
const jonas = randomUUID();
const sabine = randomUUID();
const bauamt = randomUUID();
const hauptamt = randomUUID();

function membership(teams: Record<UUID, UUID[]>): TeamMembership {
  return {
    membersOf: (teamId) => teams[teamId] ?? [],
    teamsOf: (userId) =>
      Object.entries(teams)
        .filter(([, members]) => members.includes(userId))
        .map(([teamId]) => teamId as UUID),
  };
}

const teams = membership({ [bauamt]: [lena, jonas], [hauptamt]: [sabine] });

function sharing() {
  return new WorkspaceSharing({ workspaceId: randomUUID(), ownerId: owner });
}

describe(WorkspaceSharing.name, () => {
  it('gives the owner, invited people and members of invited teams access', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [sabine], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );

    expect(subject.levelOf(owner, [])).toBe('owner');
    expect(subject.levelOf(sabine, [hauptamt])).toBe('use');
    expect(subject.levelOf(lena, [bauamt])).toBe('use');
    expect(subject.levelOf(randomUUID(), [])).toBeNull();
  });

  it('takes the highest of all grants', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    subject.setSharedWithOrganization(true);
    subject.setLevel(lena, 'full', { type: 'team', teamId: bauamt }, teams);

    expect(subject.levelOf(lena, [bauamt])).toBe('full');
    expect(subject.levelOf(jonas, [bauamt])).toBe('use');
  });

  it('moves a directly invited team member into the team section', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [lena], teamIds: [], level: 'edit', at: new Date() },
      teams,
    );
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );

    expect(subject.people.has(lena)).toBe(false);
    expect(subject.placementOf(lena, teams)).toEqual({
      type: 'team',
      teamId: bauamt,
    });
    expect(subject.levelOf(lena, [bauamt])).toBe('edit');
  });

  it('places a member of two teams invited together in the same team after a reload', () => {
    const both = membership({ [bauamt]: [lena], [hauptamt]: [lena] });
    const at = new Date();
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [hauptamt, bauamt], level: 'use', at },
      both,
    );
    const placement = subject.placementOf(lena, both);

    for (const order of [subject.teams, [...subject.teams].reverse()]) {
      const reloaded = new WorkspaceSharing({
        workspaceId: subject.workspaceId,
        ownerId: owner,
        teams: order,
      });
      expect(reloaded.placementOf(lena, both)).toEqual(placement);
    }
  });

  it('merges a direct invitation into the team the person is shown under', () => {
    const before = membership({ [bauamt]: [], [hauptamt]: [] });
    const both = membership({ [bauamt]: [lena], [hauptamt]: [lena] });
    const subject = sharing();
    subject.invite(
      { userIds: [lena], teamIds: [], level: 'edit', at: new Date(1) },
      before,
    );
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date(2) },
      before,
    );
    subject.invite(
      { userIds: [], teamIds: [hauptamt], level: 'full', at: new Date(3) },
      before,
    );

    subject.invite(
      { userIds: [], teamIds: [], level: 'use', at: new Date(4) },
      both,
    );

    expect(subject.placementOf(lena, both)).toEqual({
      type: 'team',
      teamId: hauptamt,
    });
    expect(subject.teamLevelFor(bauamt, lena)).toBe('use');

    subject.setLevel(lena, 'use', { type: 'team', teamId: hauptamt }, both);

    expect(subject.levelOf(lena, [bauamt, hauptamt])).toBe('use');
  });

  it('never lowers team access when a direct invitation moves into the team', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [lena], teamIds: [], level: 'use', at: new Date(1) },
      teams,
    );
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'full', at: new Date(2) },
      teams,
    );

    expect(subject.levelOf(lena, [bauamt])).toBe('full');
  });

  it('drops an override that equals the team level', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    subject.setLevel(lena, 'edit', { type: 'team', teamId: bauamt }, teams);
    subject.setLevel(lena, 'use', { type: 'team', teamId: bauamt }, teams);

    expect(subject.teams[0].overrides.size).toBe(0);
  });

  it('excludes a team member and removes the grant once nobody is left', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );

    subject.remove(lena, { type: 'team', teamId: bauamt }, teams);
    expect(subject.levelOf(lena, [bauamt])).toBeNull();
    expect(subject.levelOf(jonas, [bauamt])).toBe('use');

    subject.remove(jonas, { type: 'team', teamId: bauamt }, teams);
    expect(subject.teams).toEqual([]);
  });

  it('excludes from the organisation share and lets a new invitation lift it', () => {
    const subject = sharing();
    subject.setSharedWithOrganization(true);
    expect(subject.placementOf(sabine, teams)).toEqual({
      type: 'organization',
    });

    subject.remove(sabine, { type: 'organization' }, teams);
    expect(subject.levelOf(sabine, [hauptamt])).toBeNull();

    subject.invite(
      { userIds: [sabine], teamIds: [], level: 'edit', at: new Date() },
      teams,
    );
    expect(subject.levelOf(sabine, [hauptamt])).toBe('edit');
    expect(subject.organizationExclusions.has(sabine)).toBe(false);
  });

  it('stores a raised organisation level as a direct grant and drops it at "use"', () => {
    const subject = sharing();
    subject.setSharedWithOrganization(true);

    subject.setLevel(sabine, 'edit', { type: 'organization' }, teams);
    expect(subject.people.get(sabine)).toBe('edit');

    subject.setLevel(sabine, 'use', { type: 'organization' }, teams);
    expect(subject.people.has(sabine)).toBe(false);
  });

  it('keeps direct grants and clears exclusions when the organisation share ends', () => {
    const subject = sharing();
    subject.setSharedWithOrganization(true);
    subject.setLevel(sabine, 'full', { type: 'organization' }, teams);
    subject.remove(jonas, { type: 'organization' }, teams);

    subject.setSharedWithOrganization(false);

    expect(subject.levelOf(sabine, [hauptamt])).toBe('full');
    expect(subject.levelOf(randomUUID(), [])).toBeNull();
    expect(subject.organizationExclusions.size).toBe(0);
  });

  it('never invites the owner as a member', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [owner], teamIds: [], level: 'use', at: new Date() },
      teams,
    );

    expect(subject.people.size).toBe(0);
    expect(subject.levelOf(owner, [])).toBe('owner');
  });
  it('ends a team grant with its overrides; other sources stay', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [lena], teamIds: [], level: 'edit', at: new Date() },
      teams,
    );
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    subject.setSharedWithOrganization(true);

    subject.endTeamGrant(bauamt);

    expect(subject.teams).toEqual([]);
    expect(subject.levelOf(jonas, [bauamt])).toBe('use');
    expect(subject.levelOf(lena, [bauamt])).toBe('use');
    subject.setSharedWithOrganization(false);
    expect(subject.levelOf(jonas, [bauamt])).toBeNull();
  });

  it('tells which level someone keeps without a team', () => {
    const subject = sharing();
    subject.invite(
      {
        userIds: [],
        teamIds: [bauamt, hauptamt],
        level: 'use',
        at: new Date(),
      },
      membership({ [bauamt]: [lena], [hauptamt]: [lena] }),
    );
    const both = membership({ [bauamt]: [lena], [hauptamt]: [lena] });

    expect(subject.levelWithoutTeam(bauamt, lena, both)).toBe('use');
    expect(subject.levelWithoutTeam(bauamt, jonas, teams)).toBeNull();
    expect(subject.levelWithoutTeam(bauamt, owner, teams)).toBe('owner');
  });
  it('keeps a granted team as it is when it is invited again', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    subject.remove(jonas, { type: 'team', teamId: bauamt }, teams);
    subject.setLevel(lena, 'full', { type: 'team', teamId: bauamt }, teams);

    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'edit', at: new Date() },
      teams,
    );

    expect(subject.levelOf(jonas, [bauamt])).toBeNull();
    expect(subject.levelOf(lena, [bauamt])).toBe('full');
    expect(subject.teamLevelFor(bauamt, sabine)).toBe('use');
  });

  it('does not change people who already have access when they are invited again', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [sabine], teamIds: [], level: 'full', at: new Date() },
      teams,
    );

    subject.invite(
      { userIds: [sabine], teamIds: [], level: 'use', at: new Date() },
      teams,
    );

    expect(subject.levelOf(sabine, [hauptamt])).toBe('full');
  });

  it('removes only the team the person was taken out of when it becomes empty', () => {
    const emptyTeam = randomUUID();
    const subject = sharing();
    subject.invite(
      {
        userIds: [],
        teamIds: [hauptamt, emptyTeam],
        level: 'use',
        at: new Date(),
      },
      teams,
    );

    subject.remove(sabine, { type: 'team', teamId: hauptamt }, teams);

    expect(subject.teams.map(({ teamId }) => teamId)).toEqual([emptyTeam]);
  });

  it('hands ownership to a direct member and keeps the previous owner with full access', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [sabine], teamIds: [], level: 'edit', at: new Date() },
      teams,
    );

    subject.transferOwnershipTo(sabine, teams);

    expect(subject.ownerId).toBe(sabine);
    expect(subject.levelOf(sabine, [hauptamt])).toBe('owner');
    expect(subject.people.has(sabine)).toBe(false);
    expect(subject.levelOf(owner, [])).toBe('full');
    expect(subject.people.get(owner)).toBe('full');
  });

  it('hands ownership to someone who only has access through a team or the organisation', () => {
    const viaTeam = sharing();
    viaTeam.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    viaTeam.transferOwnershipTo(lena, teams);
    expect(viaTeam.levelOf(lena, [bauamt])).toBe('owner');
    expect(viaTeam.levelOf(jonas, [bauamt])).toBe('use');
    expect(viaTeam.levelOf(owner, [])).toBe('full');

    const viaOrganization = sharing();
    viaOrganization.setSharedWithOrganization(true);
    viaOrganization.transferOwnershipTo(sabine, teams);
    expect(viaOrganization.levelOf(sabine, [hauptamt])).toBe('owner');
    expect(viaOrganization.levelOf(owner, [])).toBe('full');
  });

  it('lifts an organisation exclusion of the previous owner', () => {
    const subject = sharing();
    subject.setSharedWithOrganization(true);
    subject.organizationExclusions.add(owner);

    subject.transferOwnershipTo(sabine, teams);

    expect(subject.organizationExclusions.has(owner)).toBe(false);
    expect(subject.levelOf(owner, [])).toBe('full');
  });

  it('places a previous owner who belongs to an invited team in that team', () => {
    const subject = new WorkspaceSharing({
      workspaceId: randomUUID(),
      ownerId: jonas,
    });
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );

    subject.transferOwnershipTo(lena, teams);

    expect(subject.people.has(jonas)).toBe(false);
    expect(subject.teamLevelFor(bauamt, jonas)).toBe('full');
    expect(subject.levelOf(jonas, [bauamt])).toBe('full');
  });

  it('tells who has access', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    subject.remove(jonas, { type: 'team', teamId: bauamt }, teams);

    expect(subject.hasAccess(lena, teams)).toBe(true);
    expect(subject.hasAccess(jonas, teams)).toBe(false);
    expect(subject.hasAccess(sabine, teams)).toBe(false);
  });

  it('keeps a team exclusion when the person is raised in the organisation section', () => {
    const subject = sharing();
    subject.invite(
      { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
      teams,
    );
    subject.setSharedWithOrganization(true);
    subject.remove(lena, { type: 'team', teamId: bauamt }, teams);

    subject.setLevel(lena, 'edit', { type: 'organization' }, teams);

    expect(subject.placementOf(lena, teams)).toEqual({ type: 'organization' });
    expect(subject.levelOf(lena, [bauamt])).toBe('edit');
    expect(subject.teamLevelFor(bauamt, lena)).toBeNull();
    expect(subject.levelOf(jonas, [bauamt])).toBe('use');
  });

  it('keeps a direct invitation when the person is taken out of a team they joined later', () => {
    const subject = sharing();
    const before = membership({ [bauamt]: [jonas] });
    subject.invite(
      { userIds: [lena], teamIds: [bauamt], level: 'edit', at: new Date() },
      before,
    );
    const after = membership({ [bauamt]: [jonas, lena] });
    expect(subject.placementOf(lena, after)).toEqual({
      type: 'team',
      teamId: bauamt,
    });

    subject.remove(lena, { type: 'team', teamId: bauamt }, after);

    expect(subject.levelOf(lena, [bauamt])).toBe('edit');
    expect(subject.placementOf(lena, after)).toEqual({ type: 'direct' });
    expect(subject.levelOf(jonas, [bauamt])).toBe('edit');
  });

  it('applies a level change on the team row even with a leftover direct invitation', () => {
    const subject = sharing();
    const before = membership({ [bauamt]: [jonas] });
    subject.invite(
      { userIds: [lena], teamIds: [bauamt], level: 'full', at: new Date() },
      before,
    );
    const after = membership({ [bauamt]: [jonas, lena] });

    subject.setLevel(lena, 'use', { type: 'team', teamId: bauamt }, after);

    expect(subject.levelOf(lena, [bauamt])).toBe('use');
    expect(subject.people.has(lena)).toBe(false);
  });
});
