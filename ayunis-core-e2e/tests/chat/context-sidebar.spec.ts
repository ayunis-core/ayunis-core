import { request } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import { getThreadAiContextResponse } from '../../src/clients/api/threads.client';
import { config } from '../../src/config';
import { createUser } from '../../src/factories/user.factory';
import { generatedApi } from '../../src/clients/api/generated-api';
import { handOverAtOnce } from '../../src/clients/api/handovers.client';
import { requestDeleteKnowledgeBase } from '../../src/clients/api/owned-resources.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  removeTeamMember,
} from '../../src/clients/api/teams.client';
import { createSignedInMember } from '../../src/factories/user.factory';
import {
  createPersonalThread,
  createProjectContextFixture,
  createProjectThread,
} from '../../src/factories/workspace-context.factory';
import type { ProjectContextFixture } from '../../src/factories/workspace-context.factory';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';
import { test, expect } from '../../src/fixtures/test';

const MISSING_THREAD_ID = '00000000-0000-4000-8000-000000000000';

test.setTimeout(90_000);

async function openChatContext(page: Page, threadId: string): Promise<void> {
  await page.goto(`/chats/${threadId}`);
  await page.getByTestId('chat-side-panel-toggle').click();
  await page.getByTestId('chat-side-panel-tab-context').click();
}

async function expectOwnerThreadHiddenFromMember(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  ownerThreadId: string,
  suffix: string,
): Promise<void> {
  const member = await createUser(adminApi, mail, `chat-context-${suffix}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });

  try {
    await login(memberApi, member.email, member.password);
    const missingThreadResponse = await getThreadAiContextResponse(
      memberApi,
      MISSING_THREAD_ID,
    );
    const ownerThreadResponse = await getThreadAiContextResponse(
      memberApi,
      ownerThreadId,
    );

    expect(missingThreadResponse.status()).toBe(404);
    expect(ownerThreadResponse.status()).toBe(missingThreadResponse.status());
  } finally {
    await memberApi.dispose();
  }
}

async function expectPersonalContext(
  page: Page,
  fixture: ProjectContextFixture,
): Promise<void> {
  await expect(
    page.getByTestId(`chat-context-skill-${fixture.personalSkill.id}`),
  ).toBeVisible();
  await expect(
    page.getByTestId(
      `chat-context-knowledge-base-${fixture.personalKnowledgeBase.id}`,
    ),
  ).toBeVisible();
  await expect(
    page.getByTestId(`chat-context-skill-${fixture.skill.id}`),
  ).toHaveCount(0);
  await expect(
    page.getByTestId(`chat-context-knowledge-base-${fixture.knowledgeBase.id}`),
  ).toHaveCount(0);
}

async function expectWorkspaceContext(
  page: Page,
  fixture: ProjectContextFixture,
): Promise<void> {
  const personalSkillRow = page.getByTestId(
    `chat-context-skill-${fixture.personalSkill.id}`,
  );
  const workspaceSkillRow = page.getByTestId(
    `chat-context-skill-${fixture.skill.id}`,
  );

  await expect(personalSkillRow).toBeVisible();
  await expect(workspaceSkillRow).toBeVisible();
  await expect(personalSkillRow).toContainText(fixture.personalSkill.name);
  await expect(workspaceSkillRow).toContainText(fixture.personalSkill.name);
  await expect(
    page.getByTestId(
      `chat-context-knowledge-base-${fixture.personalKnowledgeBase.id}`,
    ),
  ).toBeVisible();
  await expect(
    page.getByTestId(`chat-context-knowledge-base-${fixture.knowledgeBase.id}`),
  ).toBeVisible();
  await expect(
    page.getByTestId(`chat-context-skill-scope-${fixture.personalSkill.id}`),
  ).toHaveCount(0);
  await expect(
    page.getByTestId(`chat-context-skill-scope-${fixture.skill.id}`),
  ).toBeVisible();
  await expect(
    page.getByTestId(
      `chat-context-knowledge-base-scope-${fixture.personalKnowledgeBase.id}`,
    ),
  ).toHaveCount(0);
  await expect(
    page.getByTestId(
      `chat-context-knowledge-base-scope-${fixture.knowledgeBase.id}`,
    ),
  ).toBeVisible();
}

test('filters an attached knowledge base until a distinct user receives access', async ({
  api,
  browser,
  mail,
}) => {
  const suffix = `chat-context-access-${Date.now()}`;
  const team = await createTeam(api, `Ordnungsamt ${suffix}`);
  const member = await createSignedInMember(api, mail, suffix);
  await addTeamMember(api, team.id, member.id);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: 'personal',
      name: `Civic knowledge base ${suffix}`,
      description: 'Knowledge base handed over to a team',
    },
    { api },
  );
  const memberContext = await browser.newContext({
    storageState: member.storageState,
  });
  const memberPage = await memberContext.newPage();

  try {
    const thread = await createPersonalThread(member.api);
    const deniedResponse = await member.api.post(
      `/api/threads/${thread.id}/knowledge-bases/${knowledgeBase.id}`,
    );
    expect(deniedResponse.status()).toBe(404);
    const contextBeforeGrant =
      await generatedApi.threadAiContextControllerGetAiContext(thread.id, {
        api: member.api,
      });
    expect(contextBeforeGrant.knowledgeBases).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: knowledgeBase.id }),
      ]),
    );

    await handOverAtOnce(api, 'knowledge_base', knowledgeBase.id, {
      teamId: team.id,
    });
    await generatedApi.threadKnowledgeBasesControllerAddKnowledgeBase(
      thread.id,
      knowledgeBase.id,
      { api: member.api },
    );
    const context = await generatedApi.threadAiContextControllerGetAiContext(
      thread.id,
      { api: member.api },
    );
    expect(context.knowledgeBases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: knowledgeBase.id }),
      ]),
    );
    await openChatContext(memberPage, thread.id);
    await expect(
      memberPage.getByTestId(`chat-context-knowledge-base-${knowledgeBase.id}`),
    ).toBeVisible();

    await removeTeamMember(api, team.id, member.id);
    await expect
      .poll(async () => {
        const contextAfterRevoke =
          await generatedApi.threadAiContextControllerGetAiContext(thread.id, {
            api: member.api,
          });
        return contextAfterRevoke.knowledgeBases.some(
          ({ id }) => id === knowledgeBase.id,
        );
      })
      .toBe(false);
  } finally {
    await memberPage.close();
    await memberContext.close();
    await member.api.dispose();
    await requestDeleteKnowledgeBase(api, knowledgeBase.id);
    await deleteTeam(api, team.id);
  }
});

test('shows personal and workspace resources in the chat context sidebar', async ({
  page,
  api,
  mail,
}) => {
  const suffix = `${Date.now()}`;
  const fixture = await createProjectContextFixture(api, suffix, {
    attach: true,
  });
  const personalThread = await createPersonalThread(api);
  const workspaceThread = await createProjectThread(api, fixture.workspace.id);

  await expectOwnerThreadHiddenFromMember(
    api,
    mail,
    personalThread.id,
    suffix,
  );

  await openChatContext(page, personalThread.id);
  await expect(page.getByTestId('chat-context-content')).toBeVisible();
  await expectPersonalContext(page, fixture);

  await openChatContext(page, workspaceThread.id);
  await expectWorkspaceContext(page, fixture);
});
