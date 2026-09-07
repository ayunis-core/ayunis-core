import { request, type APIRequestContext } from '@playwright/test';
import { createUser } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage, startThread } from '../../src/flows/chat.flow';
import { login } from '../../src/clients/api/auth.client';
import { skipChatPersonalization } from '../../src/clients/api/chat-settings.client';
import { dismissWelcomeVideo } from '../../src/clients/api/onboarding.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  CreateKnowledgeBaseShareDtoEntityType,
  CreateSkillShareDtoEntityType,
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
    const denied = await memberContext.request.get(
      `/api/threads/${threadId}/source-chunks/${chunkId}`,
    );
    expect(denied.status()).toBe(404);
  } finally {
    await memberContext.close();
  }
});

test('reauthorizes a knowledge-base source before and after sharing', async ({
  api,
  browser,
  mail,
  page,
}) => {
  const suffix = `${Date.now()}`;
  await permitFirstEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      name: `Citation knowledge base ${suffix}`,
      description: 'Provides source citation evidence.',
    },
    { api },
  );
  await uploadKnowledgeBaseSource(
    api,
    knowledgeBase.id,
    `shared-mobility-${suffix}.txt`,
  );
  await waitForKnowledgeBaseSourceReady(api, knowledgeBase.id);

  const ownerThreadId = await startThread(page, 'Find shared source evidence');
  await generatedApi.threadKnowledgeBasesControllerAddKnowledgeBase(
    ownerThreadId,
    knowledgeBase.id,
    { api },
  );
  await page.goto(`/chats/${ownerThreadId}`);
  await sendMessage(page, 'E2E cite first source');
  const ownerCitation = page.getByTestId('source-citation').last();
  await expect(ownerCitation).toBeVisible();
  const chunkId = await ownerCitation.getAttribute('data-source-chunk-id');
  expect(chunkId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const member = await createUser(api, mail, `shared-citation-${suffix}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const memberContext = await browser.newContext({
    baseURL: config.baseURL,
    storageState: await memberApi.storageState(),
  });
  try {
    const memberPage = await memberContext.newPage();
    const memberThreadId = await startThread(
      memberPage,
      'Check shared source evidence',
    );
    const beforeGrant = await memberApi.get(
      `/api/threads/${memberThreadId}/source-chunks/${chunkId}`,
    );
    expect(beforeGrant.status()).toBe(404);
    const hiddenResponse = (await beforeGrant.json()) as {
      code: string;
      message: string;
    };

    const share =
      await generatedApi.sharesControllerCreateKnowledgeBaseShare(
        {
          entityType:
            CreateKnowledgeBaseShareDtoEntityType.knowledge_base,
          knowledgeBaseId: knowledgeBase.id,
        },
        { api },
      );
    await generatedApi.threadKnowledgeBasesControllerAddKnowledgeBase(
      memberThreadId,
      knowledgeBase.id,
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

    await generatedApi.sharesControllerDeleteShare(share.id, { api });
    const afterRevocation = await memberApi.get(
      `/api/threads/${memberThreadId}/source-chunks/${chunkId}`,
    );
    expect(afterRevocation.status()).toBe(404);
    expect(await afterRevocation.json()).toMatchObject({
      code: hiddenResponse.code,
      message: hiddenResponse.message,
    });
  } finally {
    await memberContext.close();
    await memberApi.dispose();
  }
});

test('reauthorizes a skill source before and after sharing', async ({
  api,
  browser,
  mail,
  page,
}) => {
  const suffix = `${Date.now()}`;
  await permitFirstEmbeddingModel(api);
  const skill = await generatedApi.skillsControllerCreate(
    {
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

  const member = await createUser(api, mail, `skill-citation-${suffix}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const memberContext = await browser.newContext({
    baseURL: config.baseURL,
    storageState: await memberApi.storageState(),
  });
  try {
    const memberPage = await memberContext.newPage();
    const memberThreadId = await startThread(
      memberPage,
      'Check skill source evidence',
    );
    const beforeGrant = await memberApi.get(
      `/api/threads/${memberThreadId}/source-chunks/${chunkId}`,
    );
    expect(beforeGrant.status()).toBe(404);

    const share = await generatedApi.sharesControllerCreateSkillShare(
      {
        entityType: CreateSkillShareDtoEntityType.skill,
        skillId: skill.id,
      },
      { api },
    );
    await generatedApi.skillsControllerToggleActive(skill.id, {
      api: memberApi,
    });
    await memberPage.goto(`/chats/${memberThreadId}`);
    await sendMessage(memberPage, 'E2E cite first source');
    const memberCitation = memberPage.getByTestId('source-citation').last();
    await expect(memberCitation).toBeVisible();
    await memberCitation.click();
    await expect(
      memberPage.getByTestId('source-citation-excerpt'),
    ).toContainText('The council approved the mobility plan');

    await generatedApi.sharesControllerDeleteShare(share.id, { api });
    const afterRevocation = await memberApi.get(
      `/api/threads/${memberThreadId}/source-chunks/${chunkId}`,
    );
    expect(afterRevocation.status()).toBe(404);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
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
