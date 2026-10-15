import { randomUUID, type UUID } from 'crypto';
import { buildSkillSlug } from 'src/common/util/skill-slug';
import { OrgSkill } from './org-skill.entity';
import { PersonalSkill } from './personal-skill.entity';
import { skillSlugName, skillSlugPrefix } from './skill-slug-prefix';
import { TeamSkill } from './team-skill.entity';

const base = {
  name: 'Protokoll erstellen',
  shortDescription: 'Protokolle',
  instructions: 'Fasse zusammen.',
};

function teamSkill(teamId: UUID) {
  return new TeamSkill({ ...base, teamId, orgId: randomUUID() });
}

describe('skillSlugName', () => {
  it('gives same-named team skills of different teams different slugs', () => {
    const bauamt = teamSkill('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const hauptamt = teamSkill('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

    const slugs = [bauamt, hauptamt].map((skill) =>
      buildSkillSlug(skillSlugPrefix(skill), skillSlugName(skill)),
    );

    expect(slugs).toEqual([
      'team__protokoll-erstellen-11111111',
      'team__protokoll-erstellen-22222222',
    ]);
  });

  it('keeps personal and organisation slugs on the name alone', () => {
    const personal = new PersonalSkill({ ...base, userId: randomUUID() });
    const org = new OrgSkill({ ...base, orgId: randomUUID() });

    expect(skillSlugName(personal)).toBe('Protokoll erstellen');
    expect(skillSlugName(org)).toBe('Protokoll erstellen');
  });

  it("names another person's personal skill after its owner, but not the viewer's own", () => {
    const viewer = randomUUID();
    const lena = randomUUID();
    const own = new PersonalSkill({
      ...base,
      name: 'Zusammenfassen',
      userId: viewer,
    });
    const ofLena = new PersonalSkill({
      ...base,
      name: 'Zusammenfassen',
      userId: lena,
    });

    expect(skillSlugName(own, viewer)).toBe('Zusammenfassen');
    expect(skillSlugName(ofLena, viewer)).toBe(
      `Zusammenfassen ${lena.slice(0, 8)}`,
    );
    expect(skillSlugName(ofLena)).toBe('Zusammenfassen');
  });
});
