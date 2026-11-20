import { randomUUID } from "node:crypto";
import { requestReleaseNoteImage } from "../../src/clients/api/release-notes.client";
import {
  createReleaseNote,
  storeReleaseNoteImage,
} from "../../src/factories/release-note.factory";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

// Release notes are the same for every user, unlike notifications.
test("a release note's image loads for every signed-in user and for nobody else", async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `release-image-${randomUUID().slice(0, 8)}`;
  const { api: firstApi } = await createMemberSession(api, mail, `${key}-a`);
  const { api: secondApi } = await createMemberSession(api, mail, `${key}-b`);
  const signedOutApi = await createApiContext({ cookies: [], origins: [] });
  try {
    const releaseNote = await createReleaseNote(
      `Routinen sind da ${key}`,
      await storeReleaseNoteImage(firstApi),
    );

    expect(
      (await requestReleaseNoteImage(signedOutApi, releaseNote)).status(),
    ).toBe(401);

    for (const userApi of [firstApi, secondApi]) {
      const response = await requestReleaseNoteImage(userApi, releaseNote);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["content-disposition"]).toBe(
        `inline; filename="${releaseNote}.png"`,
      );
      expect((await response.body()).subarray(1, 4).toString()).toBe("PNG");
    }

    const withoutImage = await createReleaseNote(`Ohne Bild ${key}`, null);
    expect(
      (await requestReleaseNoteImage(firstApi, withoutImage)).status(),
    ).toBe(404);
    expect(
      (await requestReleaseNoteImage(firstApi, randomUUID())).status(),
    ).toBe(404);
  } finally {
    await firstApi.dispose();
    await secondApi.dispose();
    await signedOutApi.dispose();
  }
});
