import type { SkillGroup } from '@/widgets/sharing-prototype/model/types';

export type AddMode = 'link' | 'create';

export type AddTarget = 'skills' | 'knowledge';

export interface PickerOption {
  id: string;
  title: string;
  description: string;
}

export interface PickerSection {
  group: SkillGroup;
  options: PickerOption[];
}
