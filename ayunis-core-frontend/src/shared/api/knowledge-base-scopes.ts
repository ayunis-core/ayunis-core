import type { KnowledgeBasesControllerFindAllParams } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const personalKnowledgeBaseListParams = {
  ownerType: 'personal',
} as const satisfies KnowledgeBasesControllerFindAllParams;

export function workspaceKnowledgeBaseListParams(
  workspaceId: string,
  pagination: Omit<
    KnowledgeBasesControllerFindAllParams,
    'ownerType' | 'workspaceId'
  > = {},
): KnowledgeBasesControllerFindAllParams {
  return {
    ownerType: 'workspace',
    workspaceId,
    ...pagination,
  };
}
