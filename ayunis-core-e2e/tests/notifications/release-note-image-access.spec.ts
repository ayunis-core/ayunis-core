import { randomUUID } from "node:crypto";
import { requestNotificationImage } from "../../src/clients/api/notifications.client";
import {
  createReleaseNoteNotification,
  storeReleaseNoteImage,
} from "../../src/factories/release-note.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

test("a notification's image loads only for its recipient, also when another user's notification shows the same image", async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `release-image-${randomUUID().slice(0, 8)}`;
  const { api: ownerApi } = await createMemberSession(api, mail, `${key}-a`);
  const { api: otherApi } = await createMemberSession(api, mail, `${key}-b`);
  try {
    const image = await storeReleaseNoteImage(ownerApi);
    const ownersNotification = await createReleaseNoteNotification(
      ownerApi,
      `Routinen sind da ${key}`,
      image,
    );

    expect(
      (await requestNotificationImage(otherApi, ownersNotification)).status(),
    ).toBe(404);

    const ownerResponse = await requestNotificationImage(
      ownerApi,
      ownersNotification,
    );
    expect(ownerResponse.status()).toBe(200);
    expect(ownerResponse.headers()["content-type"]).toBe("image/png");
    expect(ownerResponse.headers()["x-content-type-options"]).toBe("nosniff");
    expect(ownerResponse.headers()["content-disposition"]).toBe(
      `inline; filename="${ownersNotification}.png"`,
    );
    expect((await ownerResponse.body()).subarray(1, 4).toString()).toBe("PNG");

    // Every recipient of a release note gets their own notification of it.
    const othersNotification = await createReleaseNoteNotification(
      otherApi,
      `Routinen sind da ${key}`,
      image,
    );
    expect(
      (await requestNotificationImage(otherApi, othersNotification)).status(),
    ).toBe(200);
    expect(
      (await requestNotificationImage(otherApi, ownersNotification)).status(),
    ).toBe(404);

    const withoutImage = await createReleaseNoteNotification(
      ownerApi,
      `Ohne Bild ${key}`,
      null,
    );
    expect(
      (await requestNotificationImage(ownerApi, withoutImage)).status(),
    ).toBe(404);
  } finally {
    await ownerApi.dispose();
    await otherApi.dispose();
  }
});
