import type { Page } from "@playwright/test";
import { expect } from "../fixtures/test";

type WorkspaceRole = "user" | "manager" | "admin";

export async function openWorkspaceMembers(
  page: Page,
  workspaceId: string,
): Promise<void> {
  await page.goto(`/workspaces/${workspaceId}`);
  await page.getByTestId("workspace-members-open").click();
  await expect(page.getByTestId("workspace-members-dialog")).toBeVisible();
}

/** Adds the users from the open members dialog with one role. */
export async function addWorkspaceMembersThroughUi(
  page: Page,
  users: { id: string; email: string }[],
  role: WorkspaceRole,
): Promise<void> {
  const dialog = page.getByTestId("workspace-members-dialog");
  await dialog.getByTestId("workspace-members-add").click();
  for (const user of users) {
    await dialog.getByTestId("workspace-members-search").fill(user.email);
    await page.getByTestId(`workspace-members-option-${user.id}`).click();
  }
  await dialog.getByTestId("workspace-members-add-role").click();
  await page.getByTestId(`workspace-members-add-role-option-${role}`).click();
  await dialog.getByTestId("workspace-members-add-submit").click();
  for (const user of users) {
    await expect(
      dialog.getByTestId(`workspace-member-${user.id}`),
    ).toBeVisible();
  }
}

export async function changeWorkspaceRoleThroughUi(
  page: Page,
  userId: string,
  role: WorkspaceRole,
): Promise<void> {
  await page
    .getByTestId("workspace-members-dialog")
    .getByTestId(`workspace-member-role-${userId}`)
    .click();
  await page.getByTestId(`workspace-member-role-option-${role}`).click();
}
