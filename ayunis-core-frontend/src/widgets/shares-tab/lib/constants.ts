import { SharesControllerGetSharesEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type EntityType = 'agent' | 'skill' | 'knowledge_base';

export const translationNsMap: Record<EntityType, string> = {
  agent: 'agent',
  skill: 'skill',
  knowledge_base: 'knowledge-bases',
};

export const sharesEntityTypeMap: Record<
  EntityType,
  SharesControllerGetSharesEntityType
> = {
  agent: SharesControllerGetSharesEntityType.agent,
  skill: SharesControllerGetSharesEntityType.skill,
  knowledge_base: SharesControllerGetSharesEntityType.knowledge_base,
};
