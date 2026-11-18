import { request } from '@playwright/test';
import { config } from '../../src/config';
import { generatedApi } from '../../src/clients/api/generated-api';
import { chat } from '../../src/clients/api/memory.client';
import {
  WITH_PAST_CHATS,
  createPastChatsChat,
  listPastChats,
  listedPastChatIds,
  readPastChat,
  reportPastChats,
} from '../../src/clients/api/past-chats.client';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

const utcDate = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

test('lists and reads only the user’s own chats, never anonymous ones, the current chat or another user’s', async ({
  api,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = `past-chats-${Date.now()}`;
  const owner = await createMemberSession(api, mail, `${key}-owner`);
  const colleague = await createMemberSession(api, mail, `${key}-colleague`);
  const foreignOrg = await createOrg(
    `${key}-foreign`,
    test.info().outputPath('past-chats-foreign-org.json'),
  );
  const foreignApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: foreignOrg.storageState,
  });
  try {
    const empty = await createPastChatsChat(owner.api);
    const older = await createPastChatsChat(owner.api);
    for (const question of ['Hundesteuer?', 'Zweiter Hund?', 'Danke.']) {
      await chat(owner.api, older, question);
    }
    const newer = await createPastChatsChat(owner.api);
    await chat(owner.api, newer, 'Bauantrag Musterstraße');
    const anonymous = await createPastChatsChat(owner.api, {
      isAnonymous: true,
    });
    const colleagueChat = await createPastChatsChat(colleague.api);
    await chat(colleague.api, colleagueChat, 'Urlaubsantrag');
    const foreignChat = await createPastChatsChat(foreignApi);
    await chat(foreignApi, foreignChat, 'Haushaltsplan');
    const current = await createPastChatsChat(owner.api);

    expect(await reportPastChats(owner.api, current)).toEqual(WITH_PAST_CHATS);
    for (const hidden of [current, anonymous, colleagueChat, foreignChat]) {
      expect(
        await readPastChat(owner.api, current, { threadId: hidden }),
      ).toBeNull();
    }
    expect(await listedPastChatIds(owner.api, current)).toEqual([
      newer,
      older,
      empty,
    ]);
    const colleagueCurrent = await createPastChatsChat(colleague.api);
    expect(await listedPastChatIds(colleague.api, colleagueCurrent)).toEqual([
      colleagueChat,
    ]);

    const firstTurns = await readPastChat(owner.api, current, {
      threadId: older,
      turns: 2,
    });
    expect(firstTurns).toMatchObject({
      threadId: older,
      totalMessages: 6,
      nextMessageNumber: 5,
    });
    expect(firstTurns?.messages.map(({ number, role }) => [number, role])).toEqual(
      [
        [1, 'user'],
        [2, 'assistant'],
        [3, 'user'],
        [4, 'assistant'],
      ],
    );
    expect(firstTurns?.messages[0].text).toBe('Hundesteuer?');
    const lastTurn = await readPastChat(owner.api, current, {
      threadId: older,
      messageNumber: 5,
    });
    expect(lastTurn?.messages.map(({ number }) => number)).toEqual([5, 6]);
    expect(lastTurn?.nextMessageNumber).toBeNull();

    const today = await listPastChats(owner.api, current, {
      from: utcDate(),
      to: utcDate(),
    });
    expect(today.chats.map(({ threadId }) => threadId)).toEqual([newer, older]);
    expect(
      (await listPastChats(owner.api, current, { to: utcDate(-1) })).chats,
    ).toEqual([]);
  } finally {
    await Promise.all(
      [owner.api, colleague.api, foreignApi].map((context) =>
        context.dispose(),
      ),
    );
  }
});

test('pages through the list without gaps or overlaps', async ({
  api,
  mail,
}) => {
  test.setTimeout(90_000);
  const owner = await createMemberSession(
    api,
    mail,
    `past-chats-pages-${Date.now()}`,
  );
  try {
    const chats = [];
    for (let index = 0; index < 12; index++) {
      chats.push(await createPastChatsChat(owner.api));
    }
    const current = await createPastChatsChat(owner.api);

    const first = await listPastChats(owner.api, current);
    const second = await listPastChats(owner.api, current, { page: 2 });

    expect(first).toMatchObject({ page: 1, totalPages: 2, totalChats: 12 });
    expect(first.chats).toHaveLength(10);
    expect(second.chats).toHaveLength(2);
    expect(
      [...first.chats, ...second.chats].map(({ threadId }) => threadId),
    ).toEqual([...chats].reverse());
  } finally {
    await owner.api.dispose();
  }
});

test('in a workspace chat lists only that workspace’s chats, and none once the user is removed from it', async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const key = `past-chats-ws-${Date.now()}`;
  const anna = await createMemberSession(api, mail, `${key}-anna`);
  const ben = await createMemberSession(api, mail, `${key}-ben`);
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Bauamt ${key}`, icon: 'building-2' },
      { api: anna.api },
    );
    const addBen = () =>
      generatedApi.workspaceMembersControllerAdd(
        workspace.id,
        { userIds: [ben.member.id] },
        { api: anna.api },
      );
    await addBen();
    const annasWorkspaceChat = await createPastChatsChat(anna.api, {
      workspaceId: workspace.id,
    });
    await chat(anna.api, annasWorkspaceChat, 'Stellenplan');
    const personal = await createPastChatsChat(ben.api);
    await chat(ben.api, personal, 'Urlaubsantrag');
    const inWorkspace = await createPastChatsChat(ben.api, {
      workspaceId: workspace.id,
    });
    await chat(ben.api, inWorkspace, 'Bebauungsplan');
    const workspaceCurrent = await createPastChatsChat(ben.api, {
      workspaceId: workspace.id,
    });
    const current = await createPastChatsChat(ben.api);

    expect(await listedPastChatIds(ben.api, workspaceCurrent)).toEqual([
      inWorkspace,
    ]);
    expect(
      await readPastChat(ben.api, workspaceCurrent, { threadId: personal }),
    ).toBeNull();
    expect(
      await readPastChat(ben.api, workspaceCurrent, {
        threadId: annasWorkspaceChat,
      }),
    ).toBeNull();
    // The workspace chat the tools just ran in is now ben's most recent one.
    expect(await listedPastChatIds(ben.api, current)).toEqual([
      workspaceCurrent,
      inWorkspace,
      personal,
    ]);

    await generatedApi.workspaceMembersControllerRemove(
      workspace.id,
      ben.member.id,
      { api: anna.api },
    );

    expect(await listedPastChatIds(ben.api, current)).toEqual([personal]);
    expect(
      await readPastChat(ben.api, current, { threadId: inWorkspace }),
    ).toBeNull();

    await addBen();

    expect(await listedPastChatIds(ben.api, current)).toEqual([
      workspaceCurrent,
      inWorkspace,
      personal,
    ]);
    expect(
      await readPastChat(ben.api, current, { threadId: inWorkspace }),
    ).toMatchObject({ threadId: inWorkspace, totalMessages: 2 });
  } finally {
    await Promise.all([anna.api, ben.api].map((context) => context.dispose()));
  }
});
