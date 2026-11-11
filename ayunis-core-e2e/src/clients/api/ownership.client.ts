import type { APIRequestContext } from '@playwright/test';
import { config } from '../../config';

export type CollectiveOwner =
  | { ownerType: 'org' }
  | { ownerType: 'team'; teamId: string };

export function requestSkillCreation(
  api: APIRequestContext,
  owner: CollectiveOwner,
  name: string,
) {
  return api.post(`${config.apiURL}/api/skills`, {
    data: {
      ...owner,
      name,
      shortDescription: 'Answers building permit questions',
      instructions: 'Answer building permit questions.',
      isActive: true,
    },
  });
}

export function requestKnowledgeBaseCreation(
  api: APIRequestContext,
  owner: CollectiveOwner,
  name: string,
) {
  return api.post(`${config.apiURL}/api/knowledge-bases`, {
    data: { ...owner, name, description: 'Municipal statutes' },
  });
}
