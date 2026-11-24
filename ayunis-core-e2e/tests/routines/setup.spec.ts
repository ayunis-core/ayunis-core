import { randomUUID } from "node:crypto";
import { getRoutine } from "../../src/clients/api/routines.client";
import { createBlankRoutine } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

const ROUTINE_PAGE_URL = /\/routines\/([0-9a-f-]{36})$/;

test("the premade routine is created with internet access from a dialog that asks only for name, task and time", async ({
  api,
  page,
}) => {
  await page.goto("/routines");
  await page.getByTestId("create-routine-menu").click();
  await page
    .getByTestId("create-routine-premade-verkuendungsplattform")
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("routine-form-name")).toBeVisible();
  await expect(dialog.getByTestId("routine-form-prompt")).toBeVisible();
  await expect(dialog.getByTestId("routine-form-time")).toBeVisible();
  await expect(dialog.getByTestId("routine-form-model")).toHaveCount(0);
  await expect(dialog.getByTestId("routine-form-internet")).toHaveCount(0);
  const name = `Verkündungsplattform ${randomUUID().slice(0, 8)}`;
  await dialog.getByTestId("routine-form-name").fill(name);
  await dialog.getByTestId("routine-form-submit").click();

  await expect(page).toHaveURL(ROUTINE_PAGE_URL);
  const routineId = ROUTINE_PAGE_URL.exec(page.url())?.[1] ?? "";
  expect(await getRoutine(api, routineId)).toMatchObject({
    name,
    internetAccess: "all",
    modelId: null,
    enabled: true,
  });
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
