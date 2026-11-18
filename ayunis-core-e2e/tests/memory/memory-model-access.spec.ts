import {
  login,
  markWelcomeVideoSeen,
} from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  NO_MEMORY,
  REMEMBER_PROMPT,
  chat,
  clearMemory,
  createChat,
  defaultModel,
  readPersonalMemory,
  reportMemory,
} from '../../src/clients/api/memory.client';
import {
  getEffectiveLanguageModels,
  getOrgLanguageGrant,
  getTeamLanguageGrants,
  permitAnotherLanguageModel,
  removePermittedModel,
  requestMemoryAccessChange,
  setMemoryAccess,
} from '../../src/clients/api/models.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  grantTeamModel,
  requestTeamGrantMemoryAccessChange,
  setTeamModelOverride,
} from '../../src/clients/api/teams.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  openModelSettings,
  openSettings,
} from '../../src/flows/memory.flow';

const WITH_MEMORY = { tools: 'get_memory,set_memory', section: 'yes' };

test('gives memory only to chats on a model an admin allowed it for, from the next message on', async ({
  api,
  page,
}) => {
  test.setTimeout(90_000);
  const allowed = await defaultModel(api);
  const other = await permitAnotherLanguageModel(api);
  const secret = `Sachbearbeiterin im Bauamt ${Date.now()}`;
  try {
    await clearMemory(api);
    const allowedChat = await createChat(api, allowed.id);
    const otherChat = await createChat(api, other.id);

    expect(await reportMemory(api, allowedChat)).toEqual(NO_MEMORY);
    await openSettings(page);
    await expect(page.getByTestId('settings-nav-memory')).toHaveCount(0);
    await page.goto('/settings/memory');
    await expect(page.getByTestId('memory-settings-page')).toBeVisible();

    await openModelSettings(page);
    const memoryToggle = page.getByTestId(
      `model-${allowed.modelId}-memory-access-toggle`,
    );
    await memoryToggle.click();
    await expect
      .poll(() => getOrgLanguageGrant(api, allowed.id))
      .toMatchObject({ memoryAccess: true, anonymousOnly: false });
    await page.reload();
    await expect(memoryToggle).toHaveAttribute('data-state', 'checked');
    await expect(
      page.getByTestId(`model-${allowed.modelId}-anonymous-only-toggle`),
    ).toHaveAttribute('data-state', 'unchecked');

    expect(await reportMemory(api, allowedChat)).toMatchObject(WITH_MEMORY);
    expect(await reportMemory(api, otherChat)).toEqual(NO_MEMORY);
    await openSettings(page);
    await expect(page.getByTestId('settings-nav-memory')).toBeVisible();

    expect(
      await chat(api, allowedChat, `${REMEMBER_PROMPT}${secret}`),
    ).toBe('memory-stored');
    await openModelSettings(page);
    await memoryToggle.click();
    await expect
      .poll(() => getOrgLanguageGrant(api, allowed.id))
      .toMatchObject({ memoryAccess: false });

    expect(await reportMemory(api, allowedChat)).toEqual(NO_MEMORY);
    expect(await readPersonalMemory(api)).toBe(secret);
  } finally {
    await clearMemory(api);
    await setMemoryAccess(api, allowed.id, false);
    await removePermittedModel(api, other.id);
  }
});

test('lets only admins change memory access, and a super admin change it for the organization', async ({
  api,
  publicApi,
  mail,
  org,
  browser,
}) => {
  test.setTimeout(90_000);
  const model = await defaultModel(api);
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `memory-access-${Date.now()}`,
  );
  try {
    expect(
      (await requestMemoryAccessChange(memberApi, model.id, true)).status(),
    ).toBe(403);
    expect(await getOrgLanguageGrant(api, model.id)).toMatchObject({
      memoryAccess: false,
    });

    await login(publicApi, 'admin@demo.local', 'admin');
    await markWelcomeVideoSeen(publicApi);
    const superContext = await browser.newContext({
      storageState: await publicApi.storageState(),
    });
    try {
      const superPage = await superContext.newPage();
      await superPage.goto(
        `/super-admin-settings/orgs/${org.orgId}?tab=models`,
      );
      await superPage
        .getByTestId(`model-${model.modelId}-memory-access-toggle`)
        .click();
      await expect
        .poll(() => getOrgLanguageGrant(api, model.id))
        .toMatchObject({ memoryAccess: true, anonymousOnly: false });
    } finally {
      await superContext.close();
    }
  } finally {
    await setMemoryAccess(api, model.id, false);
    await memberApi.dispose();
  }
});

test('gives memory only to users whose every team grant of the model allows it', async ({
  api,
  mail,
  page,
}) => {
  test.setTimeout(150_000);
  const suffix = `memory-teams-${Date.now()}`;
  const { modelId } = await defaultModel(api);
  const allowingTeam = await createTeam(api, `Memory allowed ${suffix}`);
  const denyingTeam = await createTeam(api, `Memory denied ${suffix}`);
  const sessions = [];
  for (const name of ['allowed', 'denied', 'both']) {
    sessions.push(await createMemberSession(api, mail, `${suffix}-${name}`));
  }
  const [allowedUser, deniedUser, bothUser] = sessions;
  try {
    for (const team of [allowingTeam, denyingTeam]) {
      await setTeamModelOverride(api, team, true);
      await grantTeamModel(api, team.id, modelId);
    }
    await addTeamMember(api, allowingTeam.id, allowedUser.member.id);
    await addTeamMember(api, denyingTeam.id, deniedUser.member.id);
    await addTeamMember(api, allowingTeam.id, bothUser.member.id);
    await addTeamMember(api, denyingTeam.id, bothUser.member.id);
    const chats = await Promise.all(
      sessions.map(async ({ api: userApi }) => {
        const [permit] = await getEffectiveLanguageModels(userApi);
        return createChat(userApi, permit.id);
      }),
    );
    const [allowedChat, deniedChat, bothChat] = chats;
    const [allowingGrant] = await getTeamLanguageGrants(api, allowingTeam.id);

    expect(await reportMemory(allowedUser.api, allowedChat)).toEqual(
      NO_MEMORY,
    );
    expect(
      (
        await requestTeamGrantMemoryAccessChange(
          allowedUser.api,
          allowingTeam.id,
          allowingGrant.id,
          true,
        )
      ).status(),
    ).toBe(403);

    await page.goto(`/admin-settings/models/teams/${allowingTeam.id}`);
    await page.getByTestId(`model-${modelId}-memory-access-toggle`).click();
    await expect
      .poll(async () => (await getTeamLanguageGrants(api, allowingTeam.id))[0])
      .toMatchObject({ memoryAccess: true, anonymousOnly: false });

    expect(await reportMemory(allowedUser.api, allowedChat)).toMatchObject(
      WITH_MEMORY,
    );
    expect(await reportMemory(deniedUser.api, deniedChat)).toEqual(NO_MEMORY);
    expect(await reportMemory(bothUser.api, bothChat)).toEqual(NO_MEMORY);
  } finally {
    await deleteTeam(api, allowingTeam.id);
    await deleteTeam(api, denyingTeam.id);
    for (const { member, api: userApi } of sessions) {
      await generatedApi.userControllerDeleteUser(member.id, { api });
      await userApi.dispose();
    }
  }
});
