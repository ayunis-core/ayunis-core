import { randomUUID } from "node:crypto";
import { login } from "../../src/clients/api/auth.client";
import {
  listFavoriteReferenceIds,
  requestFavoriteToggle,
  toggleFavorite,
} from "../../src/clients/api/favorites.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  createRoutine,
  finishingRoutine,
} from "../../src/clients/api/routines.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createUser } from "../../src/factories/user.factory";
import { routineCard } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

test("a routine favorite is an explicit choice that opens the routine, follows its name and goes with it", async ({
  page,
  api,
}) => {
  const key = randomUUID().slice(0, 8);
  const routine = await createRoutine(api, finishingRoutine(`Amtsblatt ${key}`));
  const sidebar = page.getByTestId("sidebar");
  const favorite = (name: string) =>
    sidebar.getByRole("link", { name, exact: true });

  await page.goto("/routines");
  const card = routineCard(page, routine.name);
  await expect(card).toBeVisible();
  await expect(favorite(routine.name)).toHaveCount(0);
  await card.getByRole("button", { name: "Zu Favoriten hinzufügen" }).click();
  await expect(favorite(routine.name)).toBeVisible();

  await page.reload();
  await expect(
    card.getByRole("button", { name: "Aus Favoriten entfernen" }),
  ).toBeVisible();
  await favorite(routine.name).click();
  await expect(page).toHaveURL(new RegExp(`/routines/${routine.id}$`));
  await expect(page.getByTestId("routine-detail")).toBeVisible();

  const renamed = `Gesetzblatt ${key}`;
  await page.getByTestId("routine-form-name").fill(renamed);
  await page.getByTestId("routine-form-submit").click();
  await expect(favorite(renamed)).toBeVisible();
  await expect(favorite(routine.name)).toHaveCount(0);

  await page.getByRole("button", { name: "Aus Favoriten entfernen" }).click();
  await expect(favorite(renamed)).toHaveCount(0);
  await page.getByRole("button", { name: "Zu Favoriten hinzufügen" }).click();
  await expect(favorite(renamed)).toBeVisible();

  await page.getByTestId("routine-detail-delete").click();
  await page.getByTestId("confirmation-confirm").click();
  await expect(page).toHaveURL(/\/routines$/);
  await expect(favorite(renamed)).toHaveCount(0);
  expect(await listFavoriteReferenceIds(api)).not.toContain(routine.id);
});

test("another member of the organization cannot favorite a user's routine", async ({
  api,
  mail,
}) => {
  const key = `routine-favorite-scope-${randomUUID().slice(0, 8)}`;
  const routine = await createRoutine(api, finishingRoutine(`Amtsblatt ${key}`));
  const member = await createUser(api, mail, key);
  const memberApi = await createApiContext({ cookies: [], origins: [] });
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);

  expect(
    (await requestFavoriteToggle(memberApi, "routine", routine.id)).status(),
  ).toBe(404);
  expect(await listFavoriteReferenceIds(memberApi)).not.toContain(routine.id);

  await toggleFavorite(api, "routine", routine.id);
  expect(await listFavoriteReferenceIds(api)).toContain(routine.id);
  expect(await listFavoriteReferenceIds(memberApi)).not.toContain(routine.id);
  await memberApi.dispose();
});
