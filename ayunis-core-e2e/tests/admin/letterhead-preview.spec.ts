import { readFile } from "node:fs/promises";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { config } from "../../src/config";
import { test, expect } from "../../src/fixtures/test";

const previewPath = "/api/letterheads/preview";
const letterheadsPath = "/api/letterheads";
const fixture = new URL(
  "../../fixtures/screenshot-record.pdf",
  import.meta.url,
);
const margins = JSON.stringify({ top: 45, bottom: 20, left: 25, right: 20 });

async function sampleFile() {
  return {
    name: "sample-letterhead.pdf",
    mimeType: "application/pdf",
    buffer: await readFile(fixture),
  };
}

test("previews the draft first and continuation pages without saving a letterhead", async ({
  page,
  api,
}) => {
  const before = await (await api.get(letterheadsPath)).json();
  await page.goto("/admin-settings/letterheads");
  await page.getByTestId("letterheads-create").click();
  await page
    .getByTestId("letterhead-first-page-file")
    .setInputFiles(await sampleFile());
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith(previewPath) &&
      result.request().method() === "POST",
  );
  await page.getByTestId("letterhead-sample-preview-open").click();
  const pdf = await response;
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const first = page.getByTestId("letterhead-sample-preview-first");
  const following = page.getByTestId("letterhead-sample-preview-continuation");
  await expect(first).toBeVisible();
  await expect(following).toBeVisible();
  expect(await (await api.get(letterheadsPath)).json()).toEqual(before);
});

test("previews changes to a saved letterhead without persisting them", async ({
  page,
  api,
}) => {
  const creation = await api.post(letterheadsPath, {
    multipart: {
      name: "Letterhead preview edit fixture",
      firstPagePdf: await sampleFile(),
      continuationPagePdf: await sampleFile(),
      firstPageMargins: margins,
      continuationPageMargins: margins,
    },
  });
  await expect(creation).toBeOK();
  const saved = (await creation.json()) as {
    id: string;
    hasContinuationPage: boolean;
  };
  expect(saved.hasContinuationPage).toBe(true);
  await page.goto(`/admin-settings/letterheads/${saved.id}`);
  await page.getByRole("switch").uncheck();
  await page
    .getByTestId("letterhead-first-page-file")
    .setInputFiles(await sampleFile());
  await page.getByTestId("letterhead-sample-preview-open").click();
  await expect(
    page.getByTestId("letterhead-sample-preview-first"),
  ).toBeVisible();
  await expect(
    page.getByTestId("letterhead-sample-preview-continuation"),
  ).toBeVisible();
  expect(
    await (await api.get(`${letterheadsPath}/${saved.id}`)).json(),
  ).toEqual(saved);
});

test("a member and another organization's admin cannot preview a saved letterhead", async ({
  api,
  mail,
  org,
  playwright,
}, testInfo) => {
  const creation = await api.post(letterheadsPath, {
    multipart: {
      name: "Preview access fixture",
      firstPagePdf: await sampleFile(),
      firstPageMargins: margins,
      continuationPageMargins: margins,
    },
  });
  await expect(creation).toBeOK();
  const { id } = (await creation.json()) as { id: string };
  const multipart = {
    letterheadId: id,
    firstPageMargins: margins,
    continuationPageMargins: margins,
  };

  const accountKey = `lh-${org.orgId.slice(0, 8)}-${Date.now()}`;
  const member = await createMemberSession(api, mail, accountKey);
  const outsider = await createOrg(
    accountKey,
    testInfo.outputPath("other-org.json"),
  );
  const outsiderApi = await playwright.request.newContext({
    baseURL: config.apiURL,
    storageState: outsider.storageState,
  });
  try {
    const denied = await member.api.post(previewPath, { multipart });
    expect(denied.status()).toBe(403);
    expect((await outsiderApi.post(previewPath, { multipart })).status()).toBe(
      404,
    );
  } finally {
    await member.api.dispose();
    await outsiderApi.dispose();
  }
  await expect(await api.post(previewPath, { multipart })).toBeOK();

  const invalid = await api.post(previewPath, {
    multipart: { ...multipart, firstPageMargins: "null" },
  });
  expect(invalid.status()).toBe(400);
});
