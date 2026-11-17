import type { Page } from "@playwright/test";
import { expect } from "../fixtures/test";

type WorkspaceRole = "user" | "manager" | "admin";

/** Opens the members page through the workspace header's members button. */
export async function openWorkspaceMembers(
  page: Page,
  workspaceId: string,
): Promise<void> {
  await page.goto(`/workspaces/${workspaceId}`);
  await page.getByTestId("workspace-members-open").click();
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${workspaceId}/members$`),
  );
  await expect(page.getByTestId("workspace-members-page")).toBeVisible();
}

/** Adds the users from the open members page with one role. */
export async function addWorkspaceMembersThroughUi(
  page: Page,
  users: { id: string; email: string }[],
  role: WorkspaceRole,
): Promise<void> {
  await page.getByTestId("workspace-members-add").click();
  const dialog = page.getByTestId("workspace-members-add-dialog");
  for (const user of users) {
    await dialog.getByTestId("workspace-members-search").fill(user.email);
    await page.getByTestId(`workspace-members-option-${user.id}`).click();
  }
  await dialog.getByTestId("workspace-members-add-role").click();
  await page.getByTestId(`workspace-members-add-role-option-${role}`).click();
  await dialog.getByTestId("workspace-members-add-submit").click();
  await expect(dialog).toBeHidden();
  const members = page.getByTestId("workspace-members-page");
  for (const user of users) {
    await expect(
      members.getByTestId(`workspace-member-${user.id}`),
    ).toBeVisible();
  }
}

/** Changes a role on the open members page and confirms the change. */
export async function changeWorkspaceRoleThroughUi(
  page: Page,
  userId: string,
  role: WorkspaceRole,
): Promise<void> {
  await page
    .getByTestId("workspace-members-page")
    .getByTestId(`workspace-member-role-${userId}`)
    .click();
  await page.getByTestId(`workspace-member-role-option-${role}`).click();
  await page.getByTestId("confirmation-confirm").click();
}
