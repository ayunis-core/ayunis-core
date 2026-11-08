import { randomUUID } from "node:crypto";
import {
  createReleaseNoteNotification,
  LOOM_EMBED_URL,
  storeReleaseNoteImage,
} from "../../src/factories/release-note.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import {
  inboxItem,
  unreadNotificationsButton,
} from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

// A new member, so no other spec's notifications change the counts.
test("release notes get their own button and inbox filter, show without subheadline and with their image or Loom video", async ({
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
    await createReleaseNoteNotification(
      userApi,
      imageHeadline,
      await storeReleaseNoteImage(userApi),
    );
    await createReleaseNoteNotification(userApi, loomHeadline, {
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
    const button = unreadNotificationsButton(page, "release_note");
    await expect(
      button.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("2");
    await button.click();
    await expect(page).toHaveURL(/\/inbox\?type=release_note$/);
    await expect(page.getByTestId("inbox-type-filter")).toHaveAttribute(
      "data-type",
      "release_note",
    );
    const items = page.getByTestId("notification-item");
    await expect(items).toHaveCount(2);
    await expect(items.getByTestId("notification-item-subheadline")).toHaveCount(
      0,
    );

    await inboxItem(page, imageHeadline).click();
    await expect(page.getByTestId("notification-detail-headline")).toHaveText(
      imageHeadline,
    );
    await expect(
      page.getByTestId("notification-detail-subheadline"),
    ).toHaveCount(0);
    const image = page.getByTestId("notification-detail-image");
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBe(320);
    await expect(page.getByTestId("notification-detail-loom")).toHaveCount(0);

    await page.goBack();
    await inboxItem(page, loomHeadline).click();
    const video = page.getByTestId("notification-detail-loom");
    await expect(video).toHaveAttribute("src", LOOM_EMBED_URL);
    await expect.poll(() => loomRequests).toBeGreaterThan(0);
    const box = await video.boundingBox();
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(16 / 9, 1);
    await expect(page.getByTestId("notification-detail-image")).toHaveCount(0);
  } finally {
    await context.close();
    await userApi.dispose();
  }
});
