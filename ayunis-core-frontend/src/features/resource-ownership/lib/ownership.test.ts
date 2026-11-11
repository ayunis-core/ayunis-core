import { describe, expect, it } from 'vitest';
import type { AppPermission } from '@/features/permissions';
import {
  canLinkKnowledgeBase,
  canManageResource,
  manageableOwners,
  ownerOf,
} from './ownership';

const authorization = (permissions: AppPermission[]) => ({
  can: (permission: AppPermission) => permissions.includes(permission),
});

const teams = [
  {
    id: 'marketing',
    permissions: ['share_skills_with_teams'] as AppPermission[],
  },
  { id: 'engineering', permissions: [] as AppPermission[] },
];

describe('manageableOwners', () => {
  it('offers personal, the organization and teams with the team permission', () => {
    expect(
      manageableOwners(
        'skill',
        authorization(['manage_skills', 'share_skills_with_org']),
        teams,
      ),
    ).toEqual([
      { ownerType: 'personal' },
      { ownerType: 'org' },
      { ownerType: 'team', teamId: 'marketing' },
    ]);
  });

  it('only offers personal without share permissions', () => {
    expect(
      manageableOwners('knowledge-base', authorization([]), teams),
    ).toEqual([{ ownerType: 'personal' }]);
  });
});

describe('canManageResource', () => {
  const managers = authorization(['manage_skills', 'share_skills_with_org']);

  it('lets owners manage their personal skills', () => {
    expect(
      canManageResource('skill', { ownerType: 'personal' }, managers, teams),
    ).toBe(true);
  });

  it('follows the team permission for team skills', () => {
    expect(
      canManageResource(
        'skill',
        { ownerType: 'team', teamId: 'marketing' },
        managers,
        teams,
      ),
    ).toBe(true);
    expect(
      canManageResource(
        'skill',
        { ownerType: 'team', teamId: 'engineering' },
        managers,
        teams,
      ),
    ).toBe(false);
  });

  it('follows the org permission for org skills', () => {
    expect(
      canManageResource('skill', { ownerType: 'org' }, managers, teams),
    ).toBe(true);
    expect(
      canManageResource(
        'skill',
        { ownerType: 'org' },
        authorization(['manage_skills']),
        teams,
      ),
    ).toBe(false);
  });

  it('requires the org-wide manage permission the routes enforce', () => {
    expect(
      canManageResource(
        'skill',
        { ownerType: 'team', teamId: 'marketing' },
        authorization(['share_skills_with_org']),
        teams,
      ),
    ).toBe(false);
  });

  it('never manages workspace resources from here', () => {
    expect(ownerOf({ ownerType: 'workspace' })).toBeNull();
    expect(
      canManageResource('skill', { ownerType: 'workspace' }, managers, teams),
    ).toBe(false);
  });
});

describe('canLinkKnowledgeBase', () => {
  const personal = { ownerType: 'personal' as const };
  const marketing = { ownerType: 'team' as const, teamId: 'marketing' };
  const engineering = { ownerType: 'team' as const, teamId: 'engineering' };
  const org = { ownerType: 'org' as const };

  it('lets personal skills link only personal knowledge bases', () => {
    expect(canLinkKnowledgeBase(personal, personal)).toBe(true);
    expect(canLinkKnowledgeBase(personal, marketing)).toBe(false);
    expect(canLinkKnowledgeBase(personal, org)).toBe(false);
  });

  it('lets team and org skills link only knowledge bases of the same owner', () => {
    expect(canLinkKnowledgeBase(marketing, marketing)).toBe(true);
    expect(canLinkKnowledgeBase(marketing, engineering)).toBe(false);
    expect(canLinkKnowledgeBase(marketing, org)).toBe(false);
    expect(canLinkKnowledgeBase(marketing, personal)).toBe(false);
    expect(canLinkKnowledgeBase(org, org)).toBe(true);
    expect(canLinkKnowledgeBase(org, marketing)).toBe(false);
  });
});
