import type { APIRequestContext } from '@playwright/test';
import {
  createSignedInMember,
  createUser,
} from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage, startThread } from '../../src/flows/chat.flow';
import { login } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { handOverAtOnce } from '../../src/clients/api/handovers.client';
import {
  requestDeleteKnowledgeBase,
  requestDeleteSkill,
} from '../../src/clients/api/owned-resources.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  removeTeamMember,
} from '../../src/clients/api/teams.client';
import { getThreadSourceCitationResponse } from '../../src/clients/api/threads.client';
import {
  CreateKnowledgeBaseDtoOwnerType,
  CreateSkillDtoOwnerType,
} from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { config } from '../../src/config';

const SOURCE_CONTENT = `# Mobility plan

The council approved the mobility plan with a ten-percent increase in funding.

Implementation starts next quarter.`;

test('opens an accessible source citation without exposing it to another user', async ({
  api,
  browser,
  mail,
  page,
}) => {
  const suffix = `${Date.now()}`;
  const threadId = await startThread(page, 'Prepare a source-backed answer');
  await permitFirstEmbeddingModel(api);
  await uploadThreadSource(api, threadId, `mobility-plan-${suffix}.txt`);
  await waitForSourceReady(api, threadId);

  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, 'E2E cite first source');

  const citation = page.getByTestId('source-citation').last();
  await expect(citation).toBeVisible();
  const chunkId = await citation.getAttribute('data-source-chunk-id');
  expect(chunkId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  await citation.click();
  await expect(page.getByTestId('source-citation-dialog')).toBeVisible();
  await expect(page.getByTestId('source-citation-excerpt')).toContainText(
    'The council approved the mobility plan',
  );
  await expect(page.getByTestId('source-citation-full-text')).toHaveCount(0);

  const member = await createUser(api, mail, `source-citation-${suffix}`);
  const memberContext = await browser.newContext({ baseURL: config.apiURL });
  try {
    await login(memberContext.request, member.email, member.password);
    const denied = await getThreadSourceCitationResponse(
      memberContext.request,
      threadId,
      chunkId,
    );
    expect(denied.status()).toBe(404);
  } finally {
    await memberContext.close();
  }
});

test('opens citations from active knowledge bases and reauthorizes team access', async ({
  api,
  browser,
  mail,
  page,
}) => {
  const suffix = `${Date.now()}`;
  await permitFirstEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: CreateKnowledgeBaseDtoOwnerType.personal,
      name: `Citation knowledge base ${suffix}`,
      description: 'Provides source citation evidence.',
    },
    { api },
  );
  await uploadKnowledgeBaseSource(
    api,
    knowledgeBase.id,
    `team-mobility-${suffix}.txt`,
  );
  await waitForKnowledgeBaseSourceReady(api, knowledgeBase.id);

  const ownerThreadId = await startThread(page, 'Find team source evidence');
  await page.goto(`/chats/${ownerThreadId}`);
  await sendMessage(page, 'E2E cite first source');
  const ownerCitation = page.getByTestId('source-citation').last();
  await expect(ownerCitation).toBeVisible();
  const chunkId = await ownerCitation.getAttribute('data-source-chunk-id');
  expect(chunkId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const team = await createTeam(api, `Verkehrsplanung ${suffix}`);
  const member = await createSignedInMember(api, mail, `team-citation-${suffix}`);
  await addTeamMember(api, team.id, member.id);
  const memberApi = member.api;
  const memberContext = await browser.newContext({
    baseURL: config.baseURL,
    storageState: member.storageState,
  });
  try {
    const memberPage = await memberContext.newPage();
    const memberThreadId = await startThread(
      memberPage,
      'Check team source evidence',
    );
    const beforeGrant = await getThreadSourceCitationResponse(
      memberApi,
      memberThreadId,
      chunkId,
    );
    expect(beforeGrant.status()).toBe(404);
    const hiddenResponse = (await beforeGrant.json()) as {
      code: string;
      message: string;
    };

    await handOverAtOnce(api, 'knowledge_base', knowledgeBase.id, {
      teamId: team.id,
    });
    await generatedApi.knowledgeBasesControllerSetActivation(
      knowledgeBase.id,
      { isActive: true },
      { api: memberApi },
    );
    await memberPage.goto(`/chats/${memberThreadId}`);
    await sendMessage(memberPage, 'E2E cite first source');
    const memberCitation = memberPage.getByTestId('source-citation').last();
    await expect(memberCitation).toBeVisible();
    await memberCitation.click();
    await expect(
      memberPage.getByTestId('source-citation-excerpt'),
    ).toContainText('The council approved the mobility plan');

    await generatedApi.knowledgeBasesControllerSetActivation(
      knowledgeBase.id,
      { isActive: false },
      { api: memberApi },
    );
    const afterDeactivation = await getThreadSourceCitationResponse(
      memberApi,
      memberThreadId,
      chunkId,
    );
    expect(afterDeactivation.status()).toBe(404);

    await generatedApi.knowledgeBasesControllerSetActivation(
      knowledgeBase.id,
      { isActive: true },
      { api: memberApi },
    );
    const afterReactivation = await getThreadSourceCitationResponse(
      memberApi,
      memberThreadId,
      chunkId,
    );
    expect(afterReactivation.status()).toBe(200);

    await removeTeamMember(api, team.id, member.id);
    const afterRevocation = await getThreadSourceCitationResponse(
      memberApi,
      memberThreadId,
      chunkId,
    );
    expect(afterRevocation.status()).toBe(404);
    expect(await afterRevocation.json()).toMatchObject({
      code: hiddenResponse.code,
      message: hiddenResponse.message,
    });
  } finally {
    await memberContext.close();
    await memberApi.dispose();
    await requestDeleteKnowledgeBase(api, knowledgeBase.id);
    await deleteTeam(api, team.id);
  }
});

test('reauthorizes a skill source before and after a team handover', async ({
  api,
  browser,
  mail,
  page,
}) => {
  const suffix = `${Date.now()}`;
  await permitFirstEmbeddingModel(api);
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: CreateSkillDtoOwnerType.personal,
      name: `Citation skill ${suffix}`,
      shortDescription: 'Provides source citation evidence.',
      instructions: 'Use the attached source for evidence.',
      isActive: true,
    },
    { api },
  );
  await uploadSkillSource(api, skill.id, `skill-mobility-${suffix}.txt`);
  await waitForSkillSourceReady(api, skill.id);

  const ownerThreadId = await startThread(page, 'Find skill source evidence');
  await page.goto(`/chats/${ownerThreadId}`);
  await sendMessage(page, 'E2E cite first source');
  const ownerCitation = page.getByTestId('source-citation').last();
  await expect(ownerCitation).toBeVisible();
  const chunkId = await ownerCitation.getAttribute('data-source-chunk-id');
  expect(chunkId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const team = await createTeam(api, `Mobilitaet ${suffix}`);
  const member = await createSignedInMember(api, mail, `skill-citation-${suffix}`);
  await addTeamMember(api, team.id, member.id);
  const memberApi = member.api;
  const memberContext = await browser.newContext({
    baseURL: config.baseURL,
    storageState: member.storageState,
  });
  try {
    const memberPage = await memberContext.newPage();
    const memberThreadId = await startThread(
      memberPage,
      'Check skill source evidence',
    );
    const beforeGrant = await getThreadSourceCitationResponse(
      memberApi,
      memberThreadId,
      chunkId,
    );
    expect(beforeGrant.status()).toBe(404);

    await handOverAtOnce(api, 'skill', skill.id, { teamId: team.id });
    await generatedApi.skillsControllerActivate(
      skill.id,
      { isActive: true },
      { api: memberApi },
    );
    await memberPage.goto(`/chats/${memberThreadId}`);
    await sendMessage(memberPage, 'E2E cite first source');
    const memberCitation = memberPage.getByTestId('source-citation').last();
    await expect(memberCitation).toBeVisible();
    await memberCitation.click();
    await expect(
      memberPage.getByTestId('source-citation-excerpt'),
    ).toContainText('The council approved the mobility plan');

    await removeTeamMember(api, team.id, member.id);
    const afterRevocation = await getThreadSourceCitationResponse(
      memberApi,
      memberThreadId,
      chunkId,
    );
    expect(afterRevocation.status()).toBe(404);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
    await requestDeleteSkill(api, skill.id);
    await deleteTeam(api, team.id);
  }
});

async function permitFirstEmbeddingModel(
  api: APIRequestContext,
): Promise<void> {
  const models =
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api });
  const model = models[0];
  if (!model) throw new Error('No embedding model is available');
  if (model.permittedModelId) return;
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
}

async function uploadSkillSource(
  api: APIRequestContext,
  skillId: string,
  fileName: string,
): Promise<void> {
  const response = await api.post(`/api/skills/${skillId}/sources/file`, {
    multipart: {
      file: {
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(SOURCE_CONTENT),
      },
    },
  });
  expect(response.ok()).toBe(true);
}

async function waitForSkillSourceReady(
  api: APIRequestContext,
  skillId: string,
): Promise<void> {
  await expect
    .poll(async () => {
      const sources = await generatedApi.skillSourcesControllerGetSkillSources(
        skillId,
        { api },
      );
      return sources.map((source) => source.status);
    })
    .toEqual(['ready']);
}

async function uploadKnowledgeBaseSource(
  api: APIRequestContext,
  knowledgeBaseId: string,
  fileName: string,
): Promise<void> {
  const response = await api.post(
    `/api/knowledge-bases/${knowledgeBaseId}/documents`,
    {
      multipart: {
        file: {
          name: fileName,
          mimeType: 'text/plain',
          buffer: Buffer.from(SOURCE_CONTENT),
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
}

async function waitForKnowledgeBaseSourceReady(
  api: APIRequestContext,
  knowledgeBaseId: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const sources =
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBaseId,
            { api },
          );
        return sources.data.map((source) => source.status);
      },
      { timeout: 30_000 },
    )
    .toEqual(['ready']);
}

async function uploadThreadSource(
  api: APIRequestContext,
  threadId: string,
  fileName: string,
): Promise<void> {
  const response = await api.post(`/api/threads/${threadId}/sources/file`, {
    multipart: {
      file: {
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(SOURCE_CONTENT),
      },
    },
  });
  expect(response.ok()).toBe(true);
}

async function waitForSourceReady(
  api: APIRequestContext,
  threadId: string,
): Promise<void> {
  await expect
    .poll(async () => {
      const sources =
        await generatedApi.threadSourcesControllerGetThreadSources(threadId, {
          api,
        });
      return sources.map((source) => source.status);
    })
    .toEqual(['ready']);
}
