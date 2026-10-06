import { findPerson, findTeam } from '@/widgets/sharing-prototype/model/access';
import type {
  OwnedItem,
  Person,
} from '@/widgets/sharing-prototype/model/types';

export interface SharedSection<T extends OwnedItem> {
  key: string;
  title: string;
  skills: T[];
}

export function isOwnSkill(skill: OwnedItem, person: Person): boolean {
  return skill.owner.kind === 'user' && skill.owner.userId === person.id;
}

export function sharedSections<T extends OwnedItem>(
  skills: T[],
  person: Person,
): SharedSection<T>[] {
  const teams = person.teamIds.map((teamId) => ({
    key: teamId,
    title: `Team ${findTeam(teamId).name}`,
    skills: skills.filter(
      (skill) => skill.owner.kind === 'team' && skill.owner.teamId === teamId,
    ),
  }));
  const org = {
    key: 'org',
    title: 'Organisation',
    skills: skills.filter((skill) => skill.owner.kind === 'org'),
  };
  return [...teams, org].filter((section) => section.skills.length > 0);
}

export function sharedSkillLabel(
  skill: OwnedItem,
  viewer: Person,
): string | null {
  if (skill.submittedBy === viewer.id) return 'Eingereicht von Ihnen';
  return skill.submittedBy
    ? `Eingereicht von ${findPerson(skill.submittedBy).name}`
    : null;
}
