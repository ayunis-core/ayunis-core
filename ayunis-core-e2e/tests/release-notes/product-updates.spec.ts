import { randomUUID } from "node:crypto";
import { listNotifications } from "../../src/clients/api/notifications.client";
import { getReleaseNote } from "../../src/clients/api/release-notes.client";
import { getThread } from "../../src/clients/api/threads.client";
import {
  createReleaseNote,
  LOOM_EMBED_URL,
  storeReleaseNoteImage,
} from "../../src/factories/release-note.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { sendMessage } from "../../src/flows/chat.flow";
import { releaseNoteItem } from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

// A new member, so the notes below arrive after they joined and are unread.
test("product updates sit behind the bell, not in the inbox: unread until opened, with image or Loom video, and a chat about them", async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `release-${randomUUID().slice(0, 8)}`;
  const { api: userApi } = await createMemberSession(api, mail, key);
  const context = await browser.newContext({
    storageState: await userApi.storageState(),
  });
  try {
    const imageHeadline = `Routinen sind da ${key}`;
    const loomHeadline = `Routinen im Video ${key}`;
    const imageNoteId = await createReleaseNote(
      imageHeadline,
      await storeReleaseNoteImage(userApi),
    );
    await createReleaseNote(loomHeadline, {
      type: "loom",
      url: LOOM_EMBED_URL,
    });
    const page = await context.newPage();
    // Stands in for Loom; a frame the CSP blocks never sends this request.
    let loomRequests = 0;
    await page.route("https://www.loom.com/**", (route) => {
      loomRequests += 1;
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Loom</title>",
      });
    });

    await page.goto("/chat");
    await expect(
      page.getByTestId("sidebar-product-updates-unread"),
    ).toBeVisible();
    await page.getByTestId("sidebar-product-updates").click();
    await expect(page).toHaveURL(/\/news$/);
    const imageItem = releaseNoteItem(page, imageHeadline);
    await expect(imageItem).toHaveAttribute("data-unread", "true");
    await expect(
      imageItem.getByTestId("release-note-unread-dot"),
    ).toBeVisible();
    await expect(releaseNoteItem(page, loomHeadline)).toHaveAttribute(
      "data-unread",
      "true",
    );
    expect(await listNotifications(userApi)).toEqual([]);

    await imageItem.getByTestId("release-note-item-headline").click();
    await expect(page.getByTestId("release-note-detail-headline")).toHaveText(
      imageHeadline,
    );
    const image = page.getByTestId("release-note-detail-image");
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBe(320);
    await expect(page.getByTestId("release-note-detail-loom")).toHaveCount(0);
    await expect
      .poll(async () => (await getReleaseNote(userApi, imageNoteId)).unread)
      .toBe(false);

    await page.goBack();
    await expect(releaseNoteItem(page, imageHeadline)).toHaveAttribute(
      "data-unread",
      "false",
    );
    await releaseNoteItem(page, loomHeadline)
      .getByTestId("release-note-item-headline")
      .click();
    const video = page.getByTestId("release-note-detail-loom");
    await expect(video).toHaveAttribute("src", LOOM_EMBED_URL);
    await expect.poll(() => loomRequests).toBeGreaterThan(0);
    const box = await video.boundingBox();
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(16 / 9, 1);

    await page.goBack();
    await releaseNoteItem(page, imageHeadline)
      .getByTestId("release-note-item-headline")
      .click();
    await sendMessage(page, `Was ist neu? ${key}`);
    await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
    await expect(page.getByTestId("chat-source-release-note")).toBeVisible();
    const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? "";
    expect(await getThread(userApi, threadId)).toMatchObject({
      origin: { kind: "release_note", releaseNoteId: imageNoteId },
    });
    await page.getByTestId("chat-source-release-note").click();
    await expect(page.getByTestId("release-note-detail-headline")).toHaveText(
      imageHeadline,
    );
  } finally {
    await context.close();
    await userApi.dispose();
  }
});
