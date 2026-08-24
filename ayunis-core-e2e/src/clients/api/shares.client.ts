import type { APIRequestContext } from '@playwright/test';
import { CreateSkillShareDtoEntityType } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function createOrgSkillShare(
  api: APIRequestContext,
  skillId: string,
): Promise<void> {
  await generatedApi.sharesControllerCreateSkillShare(
    {
      entityType: CreateSkillShareDtoEntityType.skill,
      skillId,
    },
    { api },
  );
}
