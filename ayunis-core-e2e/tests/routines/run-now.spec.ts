import { findRoutineThread } from "../../src/clients/api/routines.client";
import { sidebarThreadItem } from "../../src/flows/chat.flow";
import { createBlankRoutine, routineCard } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

test("a routine run now creates a routine thread that the chat filter can hide", async ({
  api,
  page,
}) => {
  const name = `Amtsblatt ${Date.now()}`;
  await page.goto("/routines");
  await createBlankRoutine(page, {
    name,
    prompt: `E2E finish routine: ${name}`,
  });
  await page.goto("/routines");
  const card = routineCard(page, name);
  await expect(card).toBeVisible();
  await expect(card.getByTestId("routine-status")).not.toHaveAttribute(
    "data-status",
  );

  await card.getByTestId("routine-card-run-now").click();
  await expect(card.getByTestId("routine-status")).toHaveAttribute(
    "data-status",
    "succeeded",
    { timeout: 30_000 },
  );

  const thread = await findRoutineThread(api, name);

  const sidebarItem = sidebarThreadItem(page, thread.id);
  await expect(sidebarItem).toBeVisible();
  await expect(sidebarItem.getByTestId("chat-routine-icon")).toBeVisible();

  await sidebarItem.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/chats/${thread.id}`));
  await expect(page.getByTestId("routine-finished")).toBeVisible();

  const showRoutines = page.getByTestId("sidebar-chats-filter-show-routines");
  await page.getByTestId("sidebar-chats-filter").click();
  await showRoutines.click();
  await expect(sidebarItem).toHaveCount(0);
  await expect(showRoutines).toBeHidden();

  await page.getByTestId("sidebar-chats-filter").click();
  await showRoutines.click();
  await expect(sidebarItem).toBeVisible();
});
