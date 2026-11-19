import { requestFeatureToggles } from "../../src/clients/api/routines.client";
import { findSyncedReleaseNote } from "../../src/clients/database.client";
import { test, expect } from "../../src/fixtures/test";

// The note the Announcable stand-in serves (src/servers/announcable-mock.mjs),
// which the backend reads with ANNOUNCABLE_URL (.github/workflows/e2e-tests.yml).
const E2E_ANNOUNCABLE_NOTE_ID = "e2e0c0de-7a2b-4c1d-9e8f-1a2b3c4d5e6f";

// The first sync after the backend starts finds no stored notes, so it
// records the feed as old news that is unread for nobody.
test("release notes are on, and the first sync records Announcable's notes without announcing them", async ({
  api,
}) => {
  const toggles = await requestFeatureToggles(api);
  expect(await toggles.json()).toMatchObject({
    routinesEnabled: true,
    releaseNotesEnabled: true,
  });

  await expect
    .poll(() => findSyncedReleaseNote(E2E_ANNOUNCABLE_NOTE_ID), {
      timeout: 30_000,
    })
    .toEqual({
      headline: "Release notes jetzt im Posteingang",
      announced: false,
    });
});
