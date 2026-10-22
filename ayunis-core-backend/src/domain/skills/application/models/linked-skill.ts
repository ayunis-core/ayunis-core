import type {
  NamedOwner,
  NamedPerson,
} from 'src/domain/ownership/application/models/owner-names';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';

export type LinkableSkill = PersonalSkill | CollectiveSkill;

export interface OwnedSkill {
  skill: LinkableSkill;
  owner: NamedOwner;
}

export interface LinkedSkill extends OwnedSkill {
  linkedBy: NamedPerson | null;
  linkedAt: Date;
}

export interface LinkableSkills {
  own: OwnedSkill[];
  team: OwnedSkill[];
  org: OwnedSkill[];
}

export function matchesSkillSearch(
  skill: LinkableSkill,
  search: string | undefined,
): boolean {
  if (!search) return true;
  const needle = search.toLocaleLowerCase();
  return [skill.name, skill.shortDescription].some((text) =>
    text.toLocaleLowerCase().includes(needle),
  );
}

export function byName(a: OwnedSkill, b: OwnedSkill): number {
  return a.skill.name.localeCompare(b.skill.name);
}
