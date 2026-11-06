import type { UUID } from 'crypto';
import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';

describe('Team- and org-owned skills', () => {
  const teamId = '323e4567-e89b-12d3-a456-426614174002' as UUID;
  const orgId = '423e4567-e89b-12d3-a456-426614174003' as UUID;
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts council meeting minutes.',
    instructions: 'Summarise each agenda item and its resolution.',
  };

  it('is owned by exactly one team', () => {
    const skill = new TeamSkill({ ...params, teamId });

    expect(skill.teamId).toBe(teamId);
    expect('userId' in skill).toBe(false);
    expect('workspaceId' in skill).toBe(false);
    expect('orgId' in skill).toBe(false);
  });

  it('is owned by exactly one organization', () => {
    const skill = new OrgSkill({ ...params, orgId });

    expect(skill.orgId).toBe(orgId);
    expect('userId' in skill).toBe(false);
    expect('teamId' in skill).toBe(false);
  });

  it.each([
    new TeamSkill({ ...params, teamId }),
    new OrgSkill({ ...params, orgId }),
  ])('starts inactive and unpinned unless state is given', (skill) => {
    expect(skill.isActive).toBe(false);
    expect(skill.isPinned).toBe(false);
  });

  it.each([
    new TeamSkill({ ...params, teamId, isActive: true, isPinned: true }),
    new OrgSkill({ ...params, orgId, isActive: true, isPinned: true }),
  ])('keeps owner, subtype and state when properties change', (skill) => {
    const updated = skill.withUpdates({ name: 'Committee minutes' });

    expect(updated.constructor).toBe(skill.constructor);
    expect(updated.id).toBe(skill.id);
    expect(updated.name).toBe('Committee minutes');
    expect(updated.isActive).toBe(true);
    expect(updated.isPinned).toBe(true);
    if (updated instanceof TeamSkill) expect(updated.teamId).toBe(teamId);
    if (updated instanceof OrgSkill) expect(updated.orgId).toBe(orgId);
    expect(() => skill.withUpdates({ name: ' invalid ' })).toThrow(
      InvalidSkillNameError,
    );
  });

  it.each([
    new TeamSkill({ ...params, teamId, isActive: true, isPinned: true }),
    new OrgSkill({ ...params, orgId, isActive: true, isPinned: true }),
  ])('clears the pin when the skill is deactivated', (skill) => {
    const deactivated = skill.withState({ isActive: false });

    expect(deactivated.isActive).toBe(false);
    expect(deactivated.isPinned).toBe(false);
  });

  it('changes the pin without touching activation', () => {
    const skill = new TeamSkill({ ...params, teamId, isActive: true });

    const pinned = skill.withState({ isPinned: true });

    expect(pinned.isActive).toBe(true);
    expect(pinned.isPinned).toBe(true);
    expect(pinned.teamId).toBe(teamId);
  });
});
