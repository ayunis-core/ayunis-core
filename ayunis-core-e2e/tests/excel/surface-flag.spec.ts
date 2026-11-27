import { request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { config } from "../../src/config";
import {
  currentUserForAccessToken,
  handOffSessionToExcel,
  routeDenialWithBearer,
} from "../../src/clients/api/session-tokens.client";
import { expect, test } from "../../src/fixtures/test";

const disabledApiUrl =
  process.env.E2E_EXCEL_DISABLED_API_URL ?? "http://localhost:3003";

async function expectSurfaceContract(
  api: APIRequestContext,
  excelEnabled: boolean,
): Promise<unknown> {
  const toggles = await api.get("/api/feature-toggles");
  expect(toggles.status()).toBe(200);
  const toggleValues: unknown = await toggles.json();

  expect(
    (
      await api.post("/api/auth/session/handoff", {
        data: { client: "excel" },
        headers: { Origin: config.baseURL },
      })
    ).status(),
  ).toBe(excelEnabled ? 401 : 404);

  expect(
    (await api.get("/api/office-addins/outlook/manifest.xml")).status(),
  ).toBe(200);
  expect(
    (
      await api.post("/api/auth/session/handoff", {
        data: { client: "outlook" },
        headers: { Origin: config.baseURL },
      })
    ).status(),
  ).toBe(401);
  expect((await api.post("/api/auth/logout", { data: {} })).status()).toBe(200);
  return toggleValues;
}

test("the Excel surface follows its boot-time flag without affecting Outlook or session cleanup", async () => {
  const enabledApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: { cookies: [], origins: [] },
  });
  expect(await expectSurfaceContract(enabledApi, true)).toMatchObject({
    excelAddinEnabled: true,
  });

  const disabledApi = await request.newContext({
    baseURL: disabledApiUrl,
    storageState: { cookies: [], origins: [] },
  });
  try {
    expect(await expectSurfaceContract(disabledApi, false)).toMatchObject({
      excelAddinEnabled: false,
    });
    expect(
      (await disabledApi.get("/api/office-addins/excel/manifest.xml")).status(),
    ).toBe(404);
  } finally {
    await enabledApi.dispose();
    await disabledApi.dispose();
  }
});

test("an Excel token retains shared session cleanup but loses Excel scopes on a disabled instance", async ({
  org,
}) => {
  const loginApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: { cookies: [], origins: [] },
  });
  await login(loginApi, org.admin.email, org.admin.password);
  const pane = await handOffSessionToExcel(loginApi);
  await loginApi.dispose();

  expect(
    await currentUserForAccessToken(pane.accessToken, disabledApiUrl),
  ).toMatchObject({ scopes: ["session"] });
  expect(
    await routeDenialWithBearer(
      pane.accessToken,
      { method: "GET", path: "/threads" },
      disabledApiUrl,
    ),
  ).toEqual({ status: 403, code: "CLIENT_NOT_ALLOWED" });

  const disabledApi = await request.newContext({
    baseURL: disabledApiUrl,
    storageState: { cookies: [], origins: [] },
  });
  try {
    const logout = await disabledApi.post("/api/auth/logout", {
      data: { refreshToken: pane.refreshToken },
    });
    expect(logout.status()).toBe(200);
  } finally {
    await disabledApi.dispose();
  }
});
