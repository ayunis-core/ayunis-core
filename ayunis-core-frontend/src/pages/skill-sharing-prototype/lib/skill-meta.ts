import { findPerson } from '@/widgets/sharing-prototype/model/access';
import type {
  OwnedItem,
  Person,
} from '@/widgets/sharing-prototype/model/types';

export function isOwnSkill(skill: OwnedItem, person: Person): boolean {
  return skill.owner.kind === 'user' && skill.owner.userId === person.id;
}

export function sharedSkillLabel(
  skill: OwnedItem,
  viewer: Person,
): string | null {
  if (isOwnSkill(skill, viewer)) return null;
  if (skill.owner.kind === 'user') {
    return `Geteilt von ${findPerson(skill.owner.userId).name}`;
  }
  if (skill.submittedBy === viewer.id) return 'Eingereicht von Ihnen';
  return skill.submittedBy
    ? `Eingereicht von ${findPerson(skill.submittedBy).name}`
    : null;
}
