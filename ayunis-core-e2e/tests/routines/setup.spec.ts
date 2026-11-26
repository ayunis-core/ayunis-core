import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { getMarketplaceConfig } from "../../src/clients/api/marketplace.client";
import { getEffectiveDefaultModel } from "../../src/clients/api/models.client";
import { getRoutine } from "../../src/clients/api/routines.client";
import {
  createBlankRoutine,
  routineModelOption,
} from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

const ROUTINE_PAGE_URL = /\/routines\/([0-9a-f-]{36})$/;

async function defaultModelOf(api: APIRequestContext) {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error("The worker org has no default model");
  return model;
}

test("a blank routine is created without internet access and with the model chosen in the dialog", async ({
  api,
  page,
}) => {
  const model = await defaultModelOf(api);
  await page.goto("/routines");
  await page.getByTestId("create-routine-menu").click();
  await page.getByTestId("create-routine-blank").click();

  const dialog = page.getByRole("dialog");
  const name = `Amtsblatt ${randomUUID().slice(0, 8)}`;
  await dialog.getByTestId("routine-form-name").fill(name);
  await dialog
    .getByTestId("routine-form-prompt")
    .fill("Prüfe das heutige Amtsblatt auf neue Satzungen.");
  await dialog.getByTestId("routine-form-model").click();
  await routineModelOption(page, model.displayName).click();
  await dialog.getByTestId("routine-form-submit").click();

  await expect(page).toHaveURL(ROUTINE_PAGE_URL);
  const routineId = ROUTINE_PAGE_URL.exec(page.url())?.[1] ?? "";
  expect(await getRoutine(api, routineId)).toMatchObject({
    name,
    internetAccess: "off",
    modelId: model.id,
    enabled: true,
  });
});

test("a blank routine is created with the internet access chosen in the dialog", async ({
  api,
  page,
}) => {
  await page.goto("/routines");
  await page.getByTestId("create-routine-menu").click();
  await page.getByTestId("create-routine-blank").click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByTestId("routine-form-name")
    .fill(`Gesetzblatt ${randomUUID().slice(0, 8)}`);
  await dialog
    .getByTestId("routine-form-prompt")
    .fill("Prüfe das heutige Gesetz- und Verordnungsblatt NRW.");
  await dialog.getByTestId("routine-form-internet").click();
  await page.getByTestId("routine-form-internet-allowlist").click();
  await dialog.getByTestId("routine-form-allowed-domains").fill("nrw.de");
  await dialog.getByTestId("routine-form-submit").click();

  await expect(page).toHaveURL(ROUTINE_PAGE_URL);
  const routineId = ROUTINE_PAGE_URL.exec(page.url())?.[1] ?? "";
  expect(await getRoutine(api, routineId)).toMatchObject({
    internetAccess: "allowlist",
    allowedDomains: ["nrw.de"],
    modelId: null,
  });
});

test("the create menu opens the marketplace's routines in a new tab", async ({
  api,
  page,
}) => {
  const marketplace = await getMarketplaceConfig(api);
  expect(marketplace.enabled).toBe(true);

  // The e2e marketplace has no public site, so the new tab gets an empty page.
  await page
    .context()
    .route(`${marketplace.url}/**`, (route) => route.fulfill({ body: "" }));

  await page.goto("/routines");
  await page.getByTestId("create-routine-menu").click();
  const popup = page.waitForEvent("popup");
  await page.getByTestId("create-routine-marketplace").click();

  expect((await popup).url()).toBe(`${marketplace.url}/routines`);
});

test("the configuration limits a routine's internet access to the domains entered, stored as hosts", async ({
  api,
  page,
}) => {
  await page.goto("/routines");
  const routineId = await createBlankRoutine(page, {
    name: `Gesetzblatt ${randomUUID().slice(0, 8)}`,
    prompt: "Prüfe das heutige Gesetz- und Verordnungsblatt NRW.",
  });

  await expect(page.getByTestId("routine-form-allowed-domains")).toHaveCount(0);
  await page.getByTestId("routine-form-internet").click();
  await page.getByTestId("routine-form-internet-allowlist").click();
  const domains = page.getByTestId("routine-form-allowed-domains");
  await domains.fill("192.168.1.1");
  await page.getByTestId("routine-form-submit").click();
  await expect(domains).toHaveAttribute("aria-invalid", "true");
  expect((await getRoutine(api, routineId)).internetAccess).toBe("off");

  await domains.fill("https://Recht.NRW.de/path\nnrw.de");
  await page.getByTestId("routine-form-submit").click();
  await expect
    .poll(() => getRoutine(api, routineId))
    .toMatchObject({
      internetAccess: "allowlist",
      allowedDomains: ["recht.nrw.de", "nrw.de"],
    });

  await page.reload();
  await expect(domains).toHaveValue("recht.nrw.de\nnrw.de");
});
