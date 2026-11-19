import { readFile } from "node:fs/promises";
import type { APIRequestContext, Page } from "@playwright/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { getEffectiveDefaultModel } from "../../src/clients/api/models.client";
import { createEmptyThread } from "../../src/clients/api/threads.client";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { config } from "../../src/config";
import { test, expect } from "../../src/fixtures/test";

const DEFAULTS_URL = "/api/document-defaults";
const LETTERHEADS_URL = "/api/letterheads";
const FONT_FAMILY_LABEL = /Schriftart|Font family/;
const FONT_SIZE_LABEL = /Schriftgröße|Font size/;
const SAVE_LABEL = /Speichern|Save/;
const PDF_FIXTURE = new URL(
  "../../fixtures/screenshot-record.pdf",
  import.meta.url,
);

async function chooseFont(page: Page, font: string) {
  await page.getByRole("combobox", { name: FONT_FAMILY_LABEL }).click();
  const option = page.getByRole("option", { name: font, exact: true });
  await expect(option).toHaveCSS("font-family", new RegExp(font));
  await option.click();
}

async function createLetterhead(
  api: APIRequestContext,
  typography: { fontFamily?: string; fontSizePt?: string } = {},
) {
  const margins = JSON.stringify({ top: 75, bottom: 20, left: 20, right: 20 });
  const response = await api.post(LETTERHEADS_URL, {
    multipart: {
      name: "Municipal notice",
      firstPagePdf: {
        name: "letterhead.pdf",
        mimeType: "application/pdf",
        buffer: await readFile(PDF_FIXTURE),
      },
      firstPageMargins: margins,
      continuationPageMargins: margins,
      ...typography,
    },
  });
  await expect(response).toBeOK();
  return (await response.json()) as { id: string };
}

async function createDocument(api: APIRequestContext, letterheadId?: string) {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error("The test organization has no default model");
  const thread = await createEmptyThread(api, model.id);
  const artifact = await generatedApi.artifactsControllerCreate(
    {
      authorType: "ASSISTANT",
      content: "<p>Municipal notice text</p>",
      threadId: thread.id,
      title: "Municipal notice",
      letterheadId,
    },
    { api },
  );
  return `/chats/${thread.id}?artifactId=${artifact.id}`;
}

async function downloadPdf(page: Page, file: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  await (await download).saveAs(file);
  return (await readFile(file)).subarray(0, 4).toString();
}

test("uses organization defaults and an independent letterhead override in documents and PDF export", async ({
  page,
  api,
}, testInfo) => {
  const letterhead = await createLetterhead(api);

  await page.goto("/admin-settings/letterheads");
  await chooseFont(page, "Times New Roman");
  await page.getByRole("spinbutton", { name: FONT_SIZE_LABEL }).fill("10");
  const defaultsSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith(DEFAULTS_URL) &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: SAVE_LABEL }).click();
  expect((await defaultsSaved).status()).toBe(200);
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: FONT_SIZE_LABEL }),
  ).toHaveValue("10");

  await page.goto(`/admin-settings/letterheads/${letterhead.id}`);
  await chooseFont(page, "Calibri");
  let releaseRefresh!: () => void;
  const refreshHeld = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const letterheadUrl = `${LETTERHEADS_URL}/${letterhead.id}`;
  await page.route(`**${letterheadUrl}`, async (route) => {
    if (route.request().method() === "GET") {
      await refreshHeld;
    }
    await route.continue();
  });
  const refreshStarted = page.waitForRequest(
    (request) =>
      request.url().endsWith(letterheadUrl) && request.method() === "GET",
  );
  const letterheadSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith(letterheadUrl) &&
      response.request().method() === "PATCH",
  );
  try {
    await page.getByRole("button", { name: SAVE_LABEL }).click();
    expect((await letterheadSaved).status()).toBe(200);
    await refreshStarted;
    const picker = page.getByRole("combobox", { name: FONT_FAMILY_LABEL });
    // Let React apply the mutation response while the detail refresh is held.
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => requestAnimationFrame(() => done()));
        }),
    );
    await expect(picker).toHaveText("Calibri");
  } finally {
    releaseRefresh();
  }
  await expect(page.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();

  const content = page.getByTestId("artifact-document-content");
  await page.goto(await createDocument(api));
  await expect(content).toHaveCSS("font-family", /Times New Roman/);
  await expect(content).toHaveCSS("font-size", "13.3333px");
  expect(
    await downloadPdf(page, testInfo.outputPath("plain-document.pdf")),
  ).toBe("%PDF");

  await page.goto(await createDocument(api, letterhead.id));
  await expect(content).toHaveCSS("font-family", /Calibri.*Carlito/);
  await expect(content).toHaveCSS("font-size", "13.3333px");
  expect(
    await downloadPdf(page, testInfo.outputPath("letterhead-document.pdf")),
  ).toBe("%PDF");
});

test("preserves omitted values, rejects invalid sizes, and clears fonts through the settings API", async ({
  api,
}) => {
  const initial = { fontFamily: null, fontSizePt: null };
  expect(await (await api.get(DEFAULTS_URL)).json()).toEqual(initial);
  await expect(
    await api.patch(DEFAULTS_URL, {
      data: { fontFamily: "Times New Roman", fontSizePt: 10 },
    }),
  ).toBeOK();
  expect(
    await (
      await api.patch(DEFAULTS_URL, { data: { fontSizePt: null } })
    ).json(),
  ).toEqual({ fontFamily: "Times New Roman", fontSizePt: null });
  expect(
    (await api.patch(DEFAULTS_URL, { data: { fontSizePt: 5 } })).status(),
  ).toBe(400);
  expect(await (await api.patch(DEFAULTS_URL, { data: {} })).json()).toEqual({
    fontFamily: "Times New Roman",
    fontSizePt: null,
  });
  expect(
    await (
      await api.patch(DEFAULTS_URL, { data: { fontFamily: null } })
    ).json(),
  ).toEqual(initial);

  const { id } = await createLetterhead(api, {
    fontFamily: "Courier New",
    fontSizePt: "11",
  });
  const url = `${LETTERHEADS_URL}/${id}`;
  const updated = await api.patch(url, { multipart: { fontSizePt: "" } });
  await expect(updated).toBeOK();
  expect(await updated.json()).toMatchObject({
    fontFamily: "Courier New",
    fontSizePt: null,
  });
  expect(
    (await api.patch(url, { multipart: { fontFamily: "invalid" } })).status(),
  ).toBe(400);
  expect(await (await api.get(url)).json()).toMatchObject({
    fontFamily: "Courier New",
    fontSizePt: null,
  });
  expect((await api.delete(url)).status()).toBe(204);
  expect((await api.get(url)).status()).toBe(404);

  const recreated = await createLetterhead(api);
  expect(
    await (await api.get(`${LETTERHEADS_URL}/${recreated.id}`)).json(),
  ).toMatchObject(initial);
});

test("previews the saved letterhead PDF without saving edits in the document editor", async ({
  api,
  page,
}) => {
  const letterhead = await createLetterhead(api, { fontSizePt: "10" });
  await page.goto(await createDocument(api, letterhead.id));

  const content = page.getByTestId("artifact-document-content");
  await content.fill("Unsaved changes to the notice");

  const exportResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith("/export") &&
      url.searchParams.get("format") === "pdf" &&
      url.searchParams.get("versionNumber") === "1"
    );
  });
  await page.getByTestId("artifact-pdf-preview-open").click();
  expect((await exportResponse).status()).toBe(200);
  await expect(page.getByTestId("artifact-pdf-preview-page")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("artifact-pdf-preview-page")).toBeHidden();
  await expect(content).toHaveText("Unsaved changes to the notice");
});

test("downloads a Word document from the letterhead editor", async ({
  api,
  page,
}, testInfo) => {
  const letterhead = await createLetterhead(api, { fontSizePt: "10" });
  await page.goto(await createDocument(api, letterhead.id));

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Word", exact: true }).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe("Municipal notice.docx");
  const file = testInfo.outputPath("letterhead-document.docx");
  await exported.saveAs(file);
  expect((await readFile(file)).subarray(0, 4)).toEqual(
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  );
});

test("allows organization members to read defaults and scopes writes to organization admins", async ({
  api,
  mail,
  org,
  playwright,
}, testInfo) => {
  const member = await createMemberSession(api, mail, org.orgId);
  const outsider = await createOrg(
    `typography-${org.orgId}`,
    testInfo.outputPath("other-org.json"),
  );
  const outsiderApi = await playwright.request.newContext({
    baseURL: config.apiURL,
    storageState: outsider.storageState,
  });
  try {
    const data = { fontFamily: "Times New Roman", fontSizePt: 10 };
    expect((await member.api.patch(DEFAULTS_URL, { data })).status()).toBe(403);
    await expect(await api.patch(DEFAULTS_URL, { data })).toBeOK();
    expect(await (await member.api.get(DEFAULTS_URL)).json()).toEqual(data);
    expect(await (await outsiderApi.get(DEFAULTS_URL)).json()).toEqual({
      fontFamily: null,
      fontSizePt: null,
    });
    const letterhead = await createLetterhead(api);
    const url = `${LETTERHEADS_URL}/${letterhead.id}`;
    expect(
      (
        await member.api.patch(url, { multipart: { fontSizePt: "11" } })
      ).status(),
    ).toBe(403);
    expect((await outsiderApi.get(url)).status()).toBe(404);
  } finally {
    await member.api.dispose();
    await outsiderApi.dispose();
  }
});
