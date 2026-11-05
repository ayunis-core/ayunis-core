import type { APIRequestContext } from '@playwright/test';
import {
  CreateKnowledgeBaseShareDtoEntityType,
  CreateSkillShareDtoEntityType,
  type ShareResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { config } from '../../config';
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

export function requestSkillShare(
  api: APIRequestContext,
  skillId: string,
  teamId?: string,
) {
  return api.post(`${config.apiURL}/api/shares/skills`, {
    data: { entityType: CreateSkillShareDtoEntityType.skill, skillId, teamId },
  });
}

export function requestKnowledgeBaseShare(
  api: APIRequestContext,
  knowledgeBaseId: string,
  teamId?: string,
) {
  return api.post(`${config.apiURL}/api/shares/knowledge-bases`, {
    data: {
      entityType: CreateKnowledgeBaseShareDtoEntityType.knowledge_base,
      knowledgeBaseId,
      teamId,
    },
  });
}

export function requestShareDeletion(api: APIRequestContext, shareId: string) {
  return api.delete(`${config.apiURL}/api/shares/${shareId}`);
}

export function listSkillShares(
  api: APIRequestContext,
  skillId: string,
): Promise<ShareResponseDto[]> {
  return generatedApi.sharesControllerGetShares(
    { entityId: skillId, entityType: 'skill' },
    { api },
  );
}
