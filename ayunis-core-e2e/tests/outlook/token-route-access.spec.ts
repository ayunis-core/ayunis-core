import { generatedApi } from "../../src/clients/api/generated-api";
import { createChat } from "../../src/clients/api/memory.client";
import {
  currentUserForAccessToken,
  handOffSessionToOutlook,
  refreshPaneTokens,
  routeDenialWithBearer,
  routeStatus,
  routeStatusWithBearer,
  type RouteCall,
} from "../../src/clients/api/session-tokens.client";
import { createMemberSession } from "../../src/factories/user.factory";
import { expect, test } from "../../src/fixtures/test";

// An id nothing has: those routes answer 404, which is past the client guard.
const MISSING = "00000000-0000-4000-8000-000000000000";

function routesByScope(threadId: string): Record<string, RouteCall[]> {
  return {
    "academy:read": [{ method: "GET", path: "/academy-access/status" }],
    chat: [
      { method: "GET", path: "/threads" },
      { method: "GET", path: `/threads/${threadId}` },
      { method: "GET", path: "/runs/active" },
      { method: "GET", path: `/runs/threads/${threadId}/events` },
      { method: "POST", path: `/runs/threads/${threadId}/cancel` },
      { method: "GET", path: `/threads/${threadId}/source-chunks/${MISSING}` },
      {
        method: "POST",
        path: `/threads/${threadId}/pii-masks/${MISSING}/unmask`,
      },
      {
        method: "GET",
        path: `/threads/${threadId}/messages/${MISSING}/images/0`,
      },
    ],
    "chat-settings:read": [
      { method: "GET", path: "/chat-settings/chat-start-defaults" },
    ],
    "models:read": [
      { method: "GET", path: "/models/embedding/enabled" },
      { method: "GET", path: "/models/permitted/language-models" },
      { method: "GET", path: "/models/default-selection" },
      { method: "GET", path: "/models/modes" },
    ],
    session: [{ method: "GET", path: "/auth/me" }],
    uploads: [
      { method: "GET", path: `/threads/${threadId}/sources` },
      { method: "DELETE", path: `/threads/${threadId}/sources/${MISSING}` },
    ],
    voice: [{ method: "POST", path: "/transcriptions" }],
  };
}

/** Routes the embedded app keeps away from by hiding their controls. */
function closedRoutes(threadId: string): RouteCall[] {
  return [
    { method: "GET", path: "/onboarding" },
    { method: "GET", path: "/subscriptions/active" },
    { method: "GET", path: "/chat-settings/system-prompt" },
    { method: "GET", path: `/threads/${threadId}/ai-context` },
    { method: "GET", path: "/favorites" },
    { method: "GET", path: "/api-keys" },
    // The pane has no skill picker (product decision, AYC-1897).
    { method: "GET", path: "/skills?ownerType=personal" },
  ];
}

const label = ({ method, path }: RouteCall) => `${method} ${path}`;

test("an Outlook token reaches only the routes the embedded chat app calls; browser sessions and API keys are unaffected", async ({
  api,
}) => {
  const threadId = await createChat(api);
  const pane = await handOffSessionToOutlook(api);
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E route access ${Date.now()}` },
    { api },
  );

  for (const call of closedRoutes(threadId)) {
    expect
      .soft(await routeDenialWithBearer(pane.accessToken, call), label(call))
      .toEqual({ status: 403, code: "CLIENT_NOT_ALLOWED" });
    expect.soft(await routeStatus(api, call), label(call)).toBe(200);
    expect
      .soft(await routeStatusWithBearer(apiKey.secret, call), label(call))
      .toBe(401);
  }

  for (const [scope, calls] of Object.entries(routesByScope(threadId))) {
    for (const call of calls) {
      const routeLabel = `${scope} ${label(call)}`;
      const browserStatus = await routeStatus(api, call);
      expect.soft(browserStatus, routeLabel).not.toBe(403);
      expect
        .soft(await routeStatusWithBearer(pane.accessToken, call), routeLabel)
        .toBe(browserStatus);
      expect
        .soft(await routeStatusWithBearer(apiKey.secret, call), routeLabel)
        .toBe(401);
    }
  }

  const apiKeyRoute: RouteCall = {
    method: "GET",
    path: "/openai-compat/v1/models",
  };
  expect(await routeStatusWithBearer(apiKey.secret, apiKeyRoute)).toBe(200);
  expect(await routeStatusWithBearer(pane.accessToken, apiKeyRoute)).toBe(401);

  const { accessToken } = await refreshPaneTokens(pane.refreshToken);
  const [closed] = closedRoutes(threadId);
  const [opened] = routesByScope(threadId)["chat-settings:read"];
  expect(await routeDenialWithBearer(accessToken, closed)).toEqual({
    status: 403,
    code: "CLIENT_NOT_ALLOWED",
  });
  expect(await routeStatusWithBearer(accessToken, opened)).toBe(200);
});

test("reports granted scopes for Outlook sessions before and after rotation", async ({
  api,
}) => {
  const browser = await generatedApi.authenticationControllerMe({ api });
  expect(browser).toMatchObject({ scopes: [] });

  const pane = await handOffSessionToOutlook(api);
  const scopes = [
    "academy:read",
    "chat",
    "chat-settings:read",
    "models:read",
    "session",
    "uploads",
    "voice",
  ];
  expect(await currentUserForAccessToken(pane.accessToken)).toMatchObject({
    scopes,
  });

  const rotated = await refreshPaneTokens(pane.refreshToken);
  expect(await currentUserForAccessToken(rotated.accessToken)).toMatchObject({
    scopes,
  });
});

test("the chat scope preserves thread ownership for a separate Outlook principal", async ({
  api,
  mail,
}) => {
  const ownerThread = await createChat(api);
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `surface-scopes-${Date.now()}`,
  );
  try {
    const pane = await handOffSessionToOutlook(memberApi);
    const ownThread = await createChat(memberApi);
    expect(
      await routeStatus(api, {
        method: "GET",
        path: `/threads/${ownerThread}`,
      }),
    ).toBe(200);
    expect(
      await routeStatusWithBearer(pane.accessToken, {
        method: "GET",
        path: `/threads/${ownerThread}`,
      }),
    ).toBe(404);
    expect(
      await routeStatusWithBearer(pane.accessToken, {
        method: "GET",
        path: `/threads/${ownThread}`,
      }),
    ).toBe(200);
  } finally {
    await memberApi.dispose();
  }
});
