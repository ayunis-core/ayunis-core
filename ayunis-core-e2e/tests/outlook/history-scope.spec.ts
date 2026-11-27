import { createChat, defaultModel } from "../../src/clients/api/memory.client";
import {
  handOffSessionToOutlook,
  listThreadIds,
  listThreadIdsForAccessToken,
  withPaneApi,
} from "../../src/clients/api/session-tokens.client";
import { createMemberSession } from "../../src/factories/user.factory";
import { expect, test } from "../../src/fixtures/test";

// The shared history asks for no surface: the session decides which chats it
// lists, so the Outlook pane never shows web chats and the web app never shows
// Outlook chats, and nobody sees another user's chats.
test("lists only the session's own surface chats of the signed-in user", async ({
  api,
  mail,
}) => {
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `history-scope-${Date.now()}`,
  );
  try {
    const ownerPane = await handOffSessionToOutlook(api);
    const memberPane = await handOffSessionToOutlook(memberApi);
    const ownerModel = (await defaultModel(api)).id;
    const memberModel = (await defaultModel(memberApi)).id;
    const ownerWeb = await createChat(api, ownerModel);
    const ownerOutlook = await withPaneApi(ownerPane.accessToken, (pane) =>
      createChat(pane, ownerModel),
    );
    const memberWeb = await createChat(memberApi, memberModel);
    const memberOutlook = await withPaneApi(memberPane.accessToken, (pane) =>
      createChat(pane, memberModel),
    );

    const ownerPaneList = await listThreadIdsForAccessToken(
      ownerPane.accessToken,
    );
    expect(ownerPaneList).toContain(ownerOutlook);
    expect(ownerPaneList).not.toContain(ownerWeb);

    const ownerWebList = await listThreadIds(api);
    expect(ownerWebList).toContain(ownerWeb);
    expect(ownerWebList).not.toContain(ownerOutlook);

    const memberPaneList = await listThreadIdsForAccessToken(
      memberPane.accessToken,
    );
    const memberWebList = await listThreadIds(memberApi);
    expect(memberPaneList).toEqual([memberOutlook]);
    expect(memberWebList).toEqual([memberWeb]);
    for (const list of [ownerPaneList, ownerWebList]) {
      expect(list).not.toContain(memberWeb);
      expect(list).not.toContain(memberOutlook);
    }
  } finally {
    await memberApi.dispose();
  }
});
