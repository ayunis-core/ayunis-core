import { request } from "@playwright/test";
import { config } from "../../src/config";
import { generatedApi } from "../../src/clients/api/generated-api";
import { chat, defaultModel } from "../../src/clients/api/memory.client";
import { setChatHistoryAccess } from "../../src/clients/api/models.client";
import {
  WITH_PAST_CHATS,
  callPastChatTool,
  createPastChatsChat,
  grepPastChats,
  readPastChat,
  reportPastChats,
} from "../../src/clients/api/past-chats.client";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { expect, test } from "../../src/fixtures/test";

const utcDate = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

// Past chats need a model an admin allowed them for; the worker org's
// default model starts without access.
test.beforeEach(async ({ api }) => {
  await setChatHistoryAccess(api, (await defaultModel(api)).id, true);
});

test.afterEach(async ({ api }) => {
  await setChatHistoryAccess(api, (await defaultModel(api)).id, false);
});

// Every search runs in one current chat per user: the current chat is never
// searched, while the results stored in any other chat would match again.

test("greps the user’s own past messages in any case and word form, never the current chat or another user’s", async ({
  api,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = `past-chats-grep-${Date.now()}`;
  const owner = await createMemberSession(api, mail, `${key}-owner`);
  const colleague = await createMemberSession(api, mail, `${key}-colleague`);
  const foreignOrg = await createOrg(
    `${key}-foreign`,
    test.info().outputPath("past-chats-grep-foreign-org.json"),
  );
  const foreignApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: foreignOrg.storageState,
  });
  try {
    const older = await createPastChatsChat(owner.api);
    await chat(owner.api, older, "Mein BAUANTRAG für die Musterstraße");
    const newer = await createPastChatsChat(owner.api);
    await chat(owner.api, newer, "Zwei Anträge für den Zuschuss");
    await chat(owner.api, newer, "Der Antrag ist da");
    const colleagueChat = await createPastChatsChat(colleague.api);
    await chat(colleague.api, colleagueChat, "Mein Urlaubsantrag");
    const foreignChat = await createPastChatsChat(foreignApi);
    await chat(foreignApi, foreignChat, "Antrag auf Haushaltsmittel");
    const current = await createPastChatsChat(owner.api);
    await chat(owner.api, current, "Antrag im aktuellen Chat");

    expect(await reportPastChats(owner.api, current)).toEqual(WITH_PAST_CHATS);

    const excerpts = async (pattern: string) =>
      (await grepPastChats(owner.api, current, { pattern })).matches.map(
        ({ excerpt }) => excerpt,
      );
    expect(await excerpts("antrag")).toEqual([
      "Der Antrag ist da",
      "Mein BAUANTRAG für die Musterstraße",
    ]);
    expect(await excerpts("antr(a|ä)ge?")).toEqual([
      "Der Antrag ist da",
      "Zwei Anträge für den Zuschuss",
      "Mein BAUANTRAG für die Musterstraße",
    ]);
    expect(await excerpts("\\yantr(a|ä)ge?\\y")).toEqual([
      "Der Antrag ist da",
      "Zwei Anträge für den Zuschuss",
    ]);

    const { matches } = await grepPastChats(owner.api, current, {
      pattern: "zuschuss",
    });
    expect(matches).toMatchObject([
      { threadId: newer, messageNumber: 1, role: "user" },
    ]);
    const reading = await readPastChat(owner.api, current, {
      threadId: newer,
      messageNumber: matches[0].messageNumber,
      turns: 1,
    });
    expect(reading?.messages[0]).toMatchObject({
      number: 1,
      text: "Zwei Anträge für den Zuschuss",
    });

    expect(
      (
        await grepPastChats(owner.api, current, {
          pattern: "antrag",
          to: utcDate(-1),
        })
      ).matches,
    ).toEqual([]);
    expect(
      (
        await grepPastChats(owner.api, current, {
          pattern: "antrag",
          from: utcDate(),
          to: utcDate(),
        })
      ).matches,
    ).toHaveLength(2);

    // The run goes on with a result the model can correct its call from.
    expect(
      await callPastChatTool(owner.api, current, "chat_grep", { pattern: "(" }),
    ).toContain("not a valid PostgreSQL regular expression");
    expect(
      await callPastChatTool(owner.api, current, "chat_grep", {
        pattern: "a".repeat(201),
      }),
    ).toContain("parameter 'pattern' must NOT have more than 200 characters");

    const colleagueCurrent = await createPastChatsChat(colleague.api);
    expect(
      (
        await grepPastChats(colleague.api, colleagueCurrent, {
          pattern: "antrag",
        })
      ).matches,
    ).toMatchObject([
      { threadId: colleagueChat, excerpt: "Mein Urlaubsantrag" },
    ]);
  } finally {
    await Promise.all(
      [owner.api, colleague.api, foreignApi].map((context) =>
        context.dispose(),
      ),
    );
  }
});

test("returns at most 10 matching messages, newest first, and says that there are more", async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const owner = await createMemberSession(
    api,
    mail,
    `past-chats-grep-limit-${Date.now()}`,
  );
  try {
    const past = await createPastChatsChat(owner.api);
    for (let index = 1; index <= 11; index++) {
      await chat(owner.api, past, `Hund ${index}`);
    }
    const current = await createPastChatsChat(owner.api);

    const result = await grepPastChats(owner.api, current, { pattern: "hund" });

    expect(result.moreMatches).toBe(true);
    expect(result.matches.map(({ excerpt }) => excerpt)).toEqual(
      Array.from({ length: 10 }, (_, index) => `Hund ${11 - index}`),
    );
    expect(result.matches.map(({ messageNumber }) => messageNumber)).toEqual(
      Array.from({ length: 10 }, (_, index) => 21 - 2 * index),
    );
  } finally {
    await owner.api.dispose();
  }
});

test("in a workspace chat greps only that workspace’s chats, and none once the user is removed from it", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const key = `past-chats-grep-ws-${Date.now()}`;
  const anna = await createMemberSession(api, mail, `${key}-anna`);
  const ben = await createMemberSession(api, mail, `${key}-ben`);
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Bauamt ${key}`, icon: "building-2" },
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
    await chat(anna.api, annasWorkspaceChat, "Bebauungsplan von Anna");
    const personal = await createPastChatsChat(ben.api);
    await chat(ben.api, personal, "Bebauungsplan privat");
    const inWorkspace = await createPastChatsChat(ben.api, {
      workspaceId: workspace.id,
    });
    await chat(ben.api, inWorkspace, "Bebauungsplan im Projekt");
    const workspaceCurrent = await createPastChatsChat(ben.api, {
      workspaceId: workspace.id,
    });
    const current = await createPastChatsChat(ben.api);
    // A pattern that does not match its own text in the stored tool call.
    const grepped = async (threadId: string) =>
      (
        await grepPastChats(ben.api, threadId, { pattern: "bebauungs(p)lan" })
      ).matches.map((match) => match.threadId);

    expect(await grepped(current)).toEqual([inWorkspace, personal]);

    await generatedApi.workspaceMembersControllerRemove(
      workspace.id,
      ben.member.id,
      { api: anna.api },
    );

    expect(await grepped(current)).toEqual([personal]);

    await addBen();

    expect(await grepped(current)).toEqual([inWorkspace, personal]);
    expect(await grepped(workspaceCurrent)).toEqual([inWorkspace]);
  } finally {
    await Promise.all([anna.api, ben.api].map((context) => context.dispose()));
  }
});
