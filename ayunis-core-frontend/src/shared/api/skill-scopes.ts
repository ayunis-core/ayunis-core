import type { SkillsControllerFindAllParams } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const personalSkillListParams = {
  ownerType: 'personal',
} as const satisfies SkillsControllerFindAllParams;

export function workspaceSkillListParams(
  workspaceId: string,
  pagination: Omit<
    SkillsControllerFindAllParams,
    'ownerType' | 'workspaceId'
  > = {},
): SkillsControllerFindAllParams {
  return {
    ownerType: 'workspace',
    workspaceId,
    ...pagination,
  };
}
