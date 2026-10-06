import type { SkillGroup } from './types';

export const GROUP_ORDER: SkillGroup[] = ['own', 'team', 'org'];

export const GROUP_TITLE: Record<SkillGroup, string> = {
  own: 'Eigene',
  team: 'Aus Ihren Teams',
  org: 'Von der Organisation',
};
