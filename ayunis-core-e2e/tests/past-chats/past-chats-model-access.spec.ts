import {
  login,
  markWelcomeVideoSeen,
} from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  NO_MEMORY,
  createChat,
  defaultModel,
  reportMemory,
} from '../../src/clients/api/memory.client';
import {
  getEffectiveLanguageModels,
  getOrgLanguageGrant,
  getTeamLanguageGrants,
  permitAnotherLanguageModel,
  removePermittedModel,
  requestChatHistoryAccessChange,
  setChatHistoryAccess,
  setMemoryAccess,
} from '../../src/clients/api/models.client';
import {
  NO_PAST_CHATS,
  WITH_PAST_CHATS,
  reportPastChats,
} from '../../src/clients/api/past-chats.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  grantTeamModel,
  requestTeamGrantChatHistoryAccessChange,
  setTeamModelOverride,
} from '../../src/clients/api/teams.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import { openModelSettings } from '../../src/flows/memory.flow';

const WITH_MEMORY = { tools: 'get_memory,set_memory', section: 'yes' };

test('offers past chats only on a model an admin allowed them for, independently of memory, from the next message on', async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  const allowed = await defaultModel(api);
  const other = await permitAnotherLanguageModel(api);
  try {
    const allowedChat = await createChat(api, allowed.id);
    const otherChat = await createChat(api, other.id);

    expect(await reportPastChats(api, allowedChat)).toEqual(NO_PAST_CHATS);
    expect(await reportMemory(api, allowedChat)).toEqual(NO_MEMORY);

    await openModelSettings(page);
    const chatHistoryToggle = page.getByTestId(
      `model-${allowed.modelId}-chat-history-access-toggle`,
    );
    const memoryToggle = page.getByTestId(
      `model-${allowed.modelId}-memory-access-toggle`,
    );
    await chatHistoryToggle.click();
    await expect
      .poll(() => getOrgLanguageGrant(api, allowed.id))
      .toMatchObject({
        chatHistoryAccess: true,
        memoryAccess: false,
        anonymousOnly: false,
      });
    await page.reload();
    await expect(chatHistoryToggle).toHaveAttribute('data-state', 'checked');
    await expect(memoryToggle).toHaveAttribute('data-state', 'unchecked');

    expect(await reportPastChats(api, allowedChat)).toEqual(WITH_PAST_CHATS);
    expect(await reportMemory(api, allowedChat)).toEqual(NO_MEMORY);
    expect(await reportPastChats(api, otherChat)).toEqual(NO_PAST_CHATS);

    await setMemoryAccess(api, allowed.id, true);
    expect(await reportPastChats(api, allowedChat)).toEqual(WITH_PAST_CHATS);
    expect(await reportMemory(api, allowedChat)).toMatchObject(WITH_MEMORY);

    await openModelSettings(page);
    await chatHistoryToggle.click();
    await expect
      .poll(() => getOrgLanguageGrant(api, allowed.id))
      .toMatchObject({ chatHistoryAccess: false, memoryAccess: true });

    expect(await reportPastChats(api, allowedChat)).toEqual(NO_PAST_CHATS);
    expect(await reportMemory(api, allowedChat)).toMatchObject(WITH_MEMORY);
  } finally {
    await setChatHistoryAccess(api, allowed.id, false);
    await setMemoryAccess(api, allowed.id, false);
    await removePermittedModel(api, other.id);
  }
});

test('lets only admins change past-chat access, and a super admin change it for the organization', async ({
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
    `chat-history-access-${Date.now()}`,
  );
  try {
    expect(
      (await requestChatHistoryAccessChange(memberApi, model.id, true)).status(),
    ).toBe(403);
    expect(await getOrgLanguageGrant(api, model.id)).toMatchObject({
      chatHistoryAccess: false,
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
        .getByTestId(`model-${model.modelId}-chat-history-access-toggle`)
        .click();
      await expect
        .poll(() => getOrgLanguageGrant(api, model.id))
        .toMatchObject({
          chatHistoryAccess: true,
          memoryAccess: false,
          anonymousOnly: false,
        });
    } finally {
      await superContext.close();
    }
  } finally {
    await setChatHistoryAccess(api, model.id, false);
    await memberApi.dispose();
  }
});

test('offers past chats only to users whose every team grant of the model allows it', async ({
  api,
  mail,
  page,
}) => {
  test.setTimeout(150_000);
  const suffix = `chat-history-teams-${Date.now()}`;
  const { modelId } = await defaultModel(api);
  const allowingTeam = await createTeam(api, `Past chats allowed ${suffix}`);
  const denyingTeam = await createTeam(api, `Past chats denied ${suffix}`);
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

    expect(await reportPastChats(allowedUser.api, allowedChat)).toEqual(
      NO_PAST_CHATS,
    );
    expect(
      (
        await requestTeamGrantChatHistoryAccessChange(
          allowedUser.api,
          allowingTeam.id,
          allowingGrant.id,
          true,
        )
      ).status(),
    ).toBe(403);

    await page.goto(`/admin-settings/models/teams/${allowingTeam.id}`);
    await page
      .getByTestId(`model-${modelId}-chat-history-access-toggle`)
      .click();
    await expect
      .poll(async () => (await getTeamLanguageGrants(api, allowingTeam.id))[0])
      .toMatchObject({
        chatHistoryAccess: true,
        memoryAccess: false,
        anonymousOnly: false,
      });

    expect(await reportPastChats(allowedUser.api, allowedChat)).toEqual(
      WITH_PAST_CHATS,
    );
    expect(await reportPastChats(deniedUser.api, deniedChat)).toEqual(
      NO_PAST_CHATS,
    );
    expect(await reportPastChats(bothUser.api, bothChat)).toEqual(
      NO_PAST_CHATS,
    );
  } finally {
    await deleteTeam(api, allowingTeam.id);
    await deleteTeam(api, denyingTeam.id);
    for (const { member, api: userApi } of sessions) {
      await generatedApi.userControllerDeleteUser(member.id, { api });
      await userApi.dispose();
    }
  }
});
