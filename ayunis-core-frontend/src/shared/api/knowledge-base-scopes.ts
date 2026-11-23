import type { KnowledgeBasesControllerFindAllParams } from '@ayunis/api-client/schemas';

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
