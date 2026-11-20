import type { APIRequestContext } from '@playwright/test';
import type { SkillResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export function createPersonalSkill(
  api: APIRequestContext,
  name: string,
): Promise<SkillResponseDto> {
  return generatedApi.skillsControllerCreate(
    {
      ownerType: 'personal',
      name,
      shortDescription: 'Drafts replies to recurring citizen requests',
      instructions: 'Draft a short, friendly reply to the citizen request.',
    },
    { api },
  );
}
