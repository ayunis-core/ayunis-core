import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { startThread } from "../../src/flows/chat.flow";

async function expectDownload(page: Page, format: string) {
  const event = page.waitForEvent("download");
  await page.getByTestId("create-file-download").click();
  const download = await event;
  expect(download.suggestedFilename()).toBe(`Bürgerbericht.${format}`);
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(await readFile(path!, "utf8")).toBe("Grüße aus Köln\n");
}

test.describe("downloadable text files", () => {
  for (const format of ["xml", "json", "txt"]) {
    test(`downloads ${format}, continues the answer and survives reload`, async ({
      page,
    }) => {
      await startThread(page, `E2E create file ${format}`);
      await expect(page.getByTestId("create-file-download")).toBeEnabled();
      await expect(page.getByTestId("create-file-name")).toHaveText(
        `Bürgerbericht.${format}`,
      );
      await expect(page.getByTestId("assistant-message").last()).toContainText(
        "file-created::continued",
      );
      await expectDownload(page, format);
      await page.reload();
      await expect(page.getByTestId("create-file-download")).toBeEnabled();
      await expectDownload(page, format);
    });
  }
});
