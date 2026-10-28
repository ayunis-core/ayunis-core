import type { APIRequestContext } from '@playwright/test';
import {
  CreateSkillShareDtoEntityType,
  type ShareResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function createOrgSkillShare(
  api: APIRequestContext,
  skillId: string,
): Promise<ShareResponseDto> {
  return generatedApi.sharesControllerCreateSkillShare(
    {
      entityType: CreateSkillShareDtoEntityType.skill,
      skillId,
    },
    { api },
  );
}
