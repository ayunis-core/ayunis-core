import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { requestCreateWorkspace } from '../../src/clients/api/workspaces.client';
import type { Page } from '@playwright/test';
import { config } from '../../src/config';

function recordSkillKnowledgeRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (/\/skills\/[^/]+\/knowledge-bases/.test(request.url())) {
      urls.push(request.url());
    }
  });
  return urls;
}

test('skills have no knowledge base routes and editors see the knowledge tip instead', async ({
  page,
  api,
}) => {
  const suffix = Date.now();
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: 'personal',
      name: `Haushalt ${suffix}`,
      shortDescription: 'Fragen zum Haushalt',
      instructions: 'Beantworte Fragen zum Haushalt.',
    },
    { api },
  );
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: 'personal',
      name: `Haushaltssatzung ${suffix}`,
      description: 'Satzung',
    },
    { api },
  );

  const list = await api.get(
    `${config.apiURL}/api/skills/${skill.id}/knowledge-bases`,
  );
  expect(list.status()).toBe(404);
  const assign = await api.post(
    `${config.apiURL}/api/skills/${skill.id}/knowledge-bases/${knowledgeBase.id}`,
  );
  expect(assign.status()).toBe(404);

  const knowledgeRequests = recordSkillKnowledgeRequests(page);
  await page.goto(`/skills/${skill.id}`);
  await expect(page.getByTestId('skill-properties-card')).toBeVisible();
  await expect(page.getByTestId('skill-knowledge-tip')).toBeVisible();
  expect(knowledgeRequests).toEqual([]);
});

test('workspace skills show the knowledge tip instead of a knowledge base card', async ({
  page,
  api,
}) => {
  const suffix = Date.now();
  const response = await requestCreateWorkspace(api, `Haushalt ${suffix}`);
  expect(response.ok()).toBe(true);
  const workspace = (await response.json()) as { id: string };
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: 'workspace',
      workspaceId: workspace.id,
      name: `Haushaltsfragen ${suffix}`,
      shortDescription: 'Fragen zum Haushalt',
      instructions: 'Beantworte Fragen zum Haushalt.',
    },
    { api },
  );

  const knowledgeRequests = recordSkillKnowledgeRequests(page);
  await page.goto(`/workspaces/${workspace.id}/skills/${skill.id}`);
  await expect(page.getByTestId('skill-properties-card')).toBeVisible();
  await expect(page.getByTestId('skill-knowledge-tip')).toBeVisible();
  expect(knowledgeRequests).toEqual([]);
});
