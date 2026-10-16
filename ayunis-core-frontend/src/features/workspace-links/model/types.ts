import type {
  LinkOwnerDto,
  LinkPersonDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type LinkKind = 'skill' | 'knowledgeBase';

export type LinkableGroup = 'own' | 'team' | 'org';

export interface LinkableItem {
  id: string;
  name: string;
  description: string;
  owner: LinkOwnerDto;
}

export interface LinkedItem extends LinkableItem {
  linkedBy: LinkPersonDto | null;
}

export interface LinkableSection {
  group: LinkableGroup;
  items: LinkableItem[];
}
