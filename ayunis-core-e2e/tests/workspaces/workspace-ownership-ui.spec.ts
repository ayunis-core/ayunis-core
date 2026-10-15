import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { requestShare } from "../../src/clients/api/workspace-sharing.client";
import { createSignedInMember } from "../../src/factories/user.factory";

async function pageFor(context: BrowserContext, workspaceId: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`/workspaces/${workspaceId}`);
  return page;
}

async function openActions(page: Page) {
  await page.getByTestId("workspace-actions-menu").click();
}

test("an owner hands a workspace over in the menu, keeps full access and can no longer delete it", async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(180_000);
  const suffix = `own-ui-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const sabine = await createSignedInMember(api, mail, `${suffix}-sabine`);
  const contexts = await Promise.all(
    [tobias, lena, sabine].map((member) =>
      browser.newContext({ storageState: member.storageState }),
    ),
  );
  const [tobiasContext, lenaContext, sabineContext] = contexts;

  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Haushalt ${suffix}`, description: "", icon: "building-2" },
      { api: tobias.api },
    );
    await requestShare(tobias.api, workspace.id, { userIds: [lena.id], accessLevel: "edit" });
    await requestShare(tobias.api, workspace.id, { userIds: [sabine.id], accessLevel: "use" });

    const sabinePage = await pageFor(sabineContext, workspace.id);
    await expect(sabinePage.getByTestId("workspace-access-badge")).toBeVisible();
    await expect(sabinePage.getByTestId("workspace-actions-menu")).toHaveCount(0);
    const lenaPage = await pageFor(lenaContext, workspace.id);
    await expect(lenaPage.getByTestId("workspace-access-badge")).toBeVisible();
    await expect(lenaPage.getByTestId("workspace-actions-menu")).toHaveCount(0);

    const tobiasPage = await pageFor(tobiasContext, workspace.id);
    await openActions(tobiasPage);
    await expect(tobiasPage.getByTestId("workspace-delete-action")).toBeVisible();
    await tobiasPage.getByTestId("workspace-transfer-action").click();
    const dialog = tobiasPage.getByTestId("workspace-transfer-dialog");
    await expect(dialog.getByTestId("workspace-transfer-confirm")).toBeDisabled();
    await dialog.getByTestId("workspace-transfer-owner").fill(`${suffix}-lena`);
    await tobiasPage.getByTestId(`workspace-transfer-option-${lena.id}`).click();
    await dialog.getByTestId("workspace-transfer-confirm").click();
    await expect(
      tobiasPage.locator('[data-sonner-toast][data-type="success"]'),
    ).toContainText(`„Haushalt ${suffix}“ gehört jetzt`);
    await expect(dialog).toHaveCount(0);
    await expect(tobiasPage.getByTestId("workspace-access-badge")).toHaveText(
      "Sie haben Vollzugriff",
    );
    await openActions(tobiasPage);
    await expect(tobiasPage.getByRole("menuitem")).toHaveCount(1);
    await expect(tobiasPage.getByTestId("workspace-transfer-action")).toHaveCount(0);
    await expect(tobiasPage.getByTestId("workspace-delete-action")).toHaveCount(0);

    await lenaPage.reload();
    await expect(lenaPage.getByTestId("workspace-access-badge")).toHaveText(
      "Ihr Arbeitsbereich",
    );
    await openActions(lenaPage);
    await lenaPage.getByTestId("workspace-delete-action").click();
    const deleteDialog = lenaPage.getByTestId("workspace-delete-dialog");
    await expect(deleteDialog).toContainText("Alle Mitglieder verlieren den Zugriff.");
    await deleteDialog.getByTestId("workspace-delete-confirmation").fill(`Haushalt ${suffix}`);
    await deleteDialog.getByTestId("workspace-delete-confirm").click();
    await expect(lenaPage).toHaveURL(/\/workspaces$/);

    await tobiasPage.reload();
    await expect(tobiasPage.getByTestId("workspace-no-access")).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    for (const member of [tobias, lena, sabine]) {
      await generatedApi.userControllerDeleteUser(member.id, { api });
      await member.api.dispose();
    }
  }
});
