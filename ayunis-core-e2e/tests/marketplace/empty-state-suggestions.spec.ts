import { randomUUID } from "node:crypto";
import { getMarketplaceConfig } from "../../src/clients/api/marketplace.client";
import { createOrg } from "../../src/factories/org.factory";
import { test, expect } from "../../src/fixtures/test";

// Marked `suggested` in the Marketplace stand-in (src/servers/marketplace-mock.mjs);
// its other entries are not.
const SUGGESTED_SKILL = "e2e-sitzungsprotokoll";
const SUGGESTED_ROUTINE = "e2e-amtsblatt";
const UNSUGGESTED_ROUTINE = "e2e-ip-domain";

// A fresh organization, so no skill or routine another spec created in the
// shared worker organization hides the empty pages.
test("the empty skills and routines pages suggest marketplace entries that open their install page", async ({
  browser,
  api,
}) => {
  test.setTimeout(120_000);
  const org = await createOrg(
    `empty-suggestions-${randomUUID().slice(0, 8)}`,
    test.info().outputPath("empty-suggestions-org.json"),
  );
  const marketplace = await getMarketplaceConfig(api);
  const context = await browser.newContext({ storageState: org.storageState });
  try {
    const page = await context.newPage();

    await page.goto("/skills");
    const skillSuggestions = page.getByTestId("empty-state-marketplace");
    await expect(skillSuggestions).toBeVisible();
    await expect(
      skillSuggestions.getByTestId("empty-state-marketplace-show-all"),
    ).toHaveAttribute("href", marketplace.url ?? "");
    await skillSuggestions
      .getByTestId(`empty-state-marketplace-${SUGGESTED_SKILL}`)
      .click();
    await expect(page).toHaveURL(`/install?skill=${SUGGESTED_SKILL}`);
    await expect(page.getByTestId("install-skill-confirm")).toBeVisible();

    await page.goto("/routines");
    const routineSuggestions = page.getByTestId("empty-state-marketplace");
    await expect(routineSuggestions).toBeVisible();
    await expect(
      routineSuggestions.getByTestId("routine-schedule-summary"),
    ).toBeVisible();
    await expect(
      routineSuggestions.getByTestId(
        `empty-state-marketplace-${UNSUGGESTED_ROUTINE}`,
      ),
    ).toHaveCount(0);
    await expect(
      routineSuggestions.getByTestId("empty-state-marketplace-show-all"),
    ).toHaveAttribute("href", `${marketplace.url}/routines`);
    await routineSuggestions
      .getByTestId(`empty-state-marketplace-${SUGGESTED_ROUTINE}`)
      .click();
    await expect(page).toHaveURL(`/install?routine=${SUGGESTED_ROUTINE}`);
    await expect(page.getByTestId("install-routine-card")).toBeVisible();
  } finally {
    await context.close();
  }
});
