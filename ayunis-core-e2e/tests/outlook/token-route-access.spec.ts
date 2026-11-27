import { request } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { createChat, defaultModel } from "../../src/clients/api/memory.client";
import {
  currentUserForAccessToken,
  handOffSession,
  refreshPaneTokens,
  routeDenialWithBearer,
  routeStatus,
  routeStatusWithBearer,
  withAccessToken,
  type OfficeSessionClient,
  type RouteCall,
} from "../../src/clients/api/session-tokens.client";
import { createMemberSession } from "../../src/factories/user.factory";
import type { OrgAdmin } from "../../src/factories/org.factory";
import { expect, test } from "../../src/fixtures/test";
import { config } from "../../src/config";

// An id nothing has: those routes answer 404, which is past the client guard.
const MISSING = "00000000-0000-4000-8000-000000000000";

function routesByScope(threadId: string): Record<string, RouteCall[]> {
  return {
    "academy:read": [{ method: "GET", path: "/academy-access/status" }],
    chat: [
      { method: "POST", path: "/threads" },
      { method: "GET", path: "/threads" },
      { method: "GET", path: `/threads/${threadId}` },
      { method: "PATCH", path: `/threads/${threadId}/title` },
      { method: "DELETE", path: `/threads/${MISSING}` },
      { method: "GET", path: "/runs/active" },
      { method: "GET", path: `/runs/threads/${threadId}/events` },
      { method: "POST", path: `/runs/threads/${threadId}/cancel` },
      { method: "POST", path: "/runs/send-message" },
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
      { method: "GET", path: `/threads/${threadId}/sources/progress` },
      { method: "POST", path: `/threads/${threadId}/uploads` },
      {
        method: "POST",
        path: `/threads/${threadId}/uploads/${MISSING}/complete`,
      },
      { method: "DELETE", path: `/threads/${threadId}/sources/${MISSING}` },
      { method: "POST", path: `/source-uploads/${MISSING}/sign` },
      { method: "DELETE", path: `/source-uploads/${MISSING}` },
    ],
    voice: [
      { method: "POST", path: "/transcriptions" },
      { method: "POST", path: "/speech" },
    ],
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
const OFFICE_CLIENTS: OfficeSessionClient[] = ["outlook", "excel"];

async function handOffFreshAdminSession(
  admin: OrgAdmin,
  client: OfficeSessionClient,
) {
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState: { cookies: [], origins: [] },
  });
  try {
    await login(api, admin.email, admin.password);
    return await handOffSession(api, client);
  } finally {
    await api.dispose();
  }
}

test("Office tokens reach only the routes the embedded chat app calls; browser sessions and API keys are unaffected", async ({
  api,
  org,
}) => {
  const permittedModelId = (await defaultModel(api)).id;
  const browserThreadId = await createChat(api, permittedModelId);
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E route access ${Date.now()}` },
    { api },
  );

  for (const client of OFFICE_CLIENTS) {
    const pane = await handOffFreshAdminSession(org.admin, client);
    const paneThreadId = await withAccessToken(pane.accessToken, (paneApi) =>
      createChat(paneApi, permittedModelId),
    );

    for (const call of closedRoutes(paneThreadId)) {
      expect
        .soft(
          await routeDenialWithBearer(pane.accessToken, call),
          `${client} ${label(call)}`,
        )
        .toEqual({ status: 403, code: "CLIENT_NOT_ALLOWED" });
    }
    for (const call of closedRoutes(browserThreadId)) {
      expect.soft(await routeStatus(api, call), label(call)).toBe(200);
      expect
        .soft(await routeStatusWithBearer(apiKey.secret, call), label(call))
        .toBe(401);
    }

    const browserRoutes = routesByScope(browserThreadId);
    const paneRoutes = routesByScope(paneThreadId);
    for (const [scope, calls] of Object.entries(paneRoutes)) {
      for (const [index, call] of calls.entries()) {
        const routeLabel = `${client} ${scope} ${label(call)}`;
        const browserStatus = await routeStatus(
          api,
          browserRoutes[scope][index],
        );
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
    expect(await routeStatusWithBearer(pane.accessToken, apiKeyRoute)).toBe(
      401,
    );

    const { accessToken } = await refreshPaneTokens(pane.refreshToken);
    const [closed] = closedRoutes(paneThreadId);
    const [opened] = paneRoutes["chat-settings:read"];
    expect(await routeDenialWithBearer(accessToken, closed)).toEqual({
      status: 403,
      code: "CLIENT_NOT_ALLOWED",
    });
    expect(await routeStatusWithBearer(accessToken, opened)).toBe(200);
  }
});

test("reports granted scopes for Outlook and Excel sessions before and after rotation", async ({
  api,
  org,
}) => {
  const browser = await generatedApi.authenticationControllerMe({ api });
  expect(browser).toMatchObject({ scopes: [] });

  const scopes = [
    "academy:read",
    "chat",
    "chat-settings:read",
    "models:read",
    "session",
    "uploads",
    "voice",
  ];
  for (const client of OFFICE_CLIENTS) {
    const pane = await handOffFreshAdminSession(org.admin, client);
    expect(await currentUserForAccessToken(pane.accessToken)).toMatchObject({
      scopes,
    });

    const rotated = await refreshPaneTokens(pane.refreshToken);
    expect(await currentUserForAccessToken(rotated.accessToken)).toMatchObject({
      scopes,
    });
  }
});

test("the chat scope preserves thread ownership for a separate Outlook principal", async ({
  api,
  mail,
}) => {
  const permittedModelId = (await defaultModel(api)).id;
  const ownerThread = await createChat(api, permittedModelId);
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `surface-scopes-${Date.now()}`,
  );
  try {
    const memberModelId = (await defaultModel(memberApi)).id;
    const pane = await handOffSession(memberApi, "outlook");
    const ownThread = await withAccessToken(pane.accessToken, (paneApi) =>
      createChat(paneApi, memberModelId),
    );
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

async function listedThreadIds(
  api: Parameters<typeof createChat>[0],
  query = "",
): Promise<string[]> {
  const response = await api.get(`/api/threads${query}`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { id: string }[] };
  return body.data.map(({ id }) => id);
}

test("the authenticated surface owns thread visibility and request parameters cannot switch it", async ({
  api,
  org,
}) => {
  const permittedModelId = (await defaultModel(api)).id;
  const browserThread = await createChat(api, permittedModelId);
  const outlook = await handOffFreshAdminSession(org.admin, "outlook");
  const excel = await handOffFreshAdminSession(org.admin, "excel");
  const outlookThread = await withAccessToken(outlook.accessToken, (paneApi) =>
    createChat(paneApi, permittedModelId),
  );
  const excelThread = await withAccessToken(excel.accessToken, (paneApi) =>
    createChat(paneApi, permittedModelId),
  );

  const browserIds = await listedThreadIds(api, "?client=excel");
  const outlookIds = await withAccessToken(outlook.accessToken, (paneApi) =>
    listedThreadIds(paneApi, "?client=excel"),
  );
  const excelIds = await withAccessToken(excel.accessToken, (paneApi) =>
    listedThreadIds(paneApi, "?client=outlook"),
  );

  expect(browserIds).toContain(browserThread);
  expect(browserIds).not.toContain(outlookThread);
  expect(browserIds).not.toContain(excelThread);
  expect(outlookIds).toContain(outlookThread);
  expect(outlookIds).not.toContain(browserThread);
  expect(outlookIds).not.toContain(excelThread);
  expect(excelIds).toContain(excelThread);
  expect(excelIds).not.toContain(browserThread);
  expect(excelIds).not.toContain(outlookThread);

  for (const foreignThread of [browserThread, excelThread]) {
    expect(
      await routeStatusWithBearer(outlook.accessToken, {
        method: "GET",
        path: `/threads/${foreignThread}`,
      }),
    ).toBe(404);
  }
  for (const foreignThread of [browserThread, outlookThread]) {
    expect(
      await routeStatusWithBearer(excel.accessToken, {
        method: "GET",
        path: `/threads/${foreignThread}`,
      }),
    ).toBe(404);
  }
});
