import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
} from "../../src/clients/api/teams.client";
import { requestShare } from "../../src/clients/api/workspace-sharing.client";
import { createSignedInMember } from "../../src/factories/user.factory";

async function pageFor(
  context: BrowserContext,
  workspaceId: string,
  tab?: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`/workspaces/${workspaceId}${tab ? `?tab=${tab}` : ""}`);
  return page;
}

test("an owner invites a person in the members dialog, raises them and removes them again", async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(180_000);
  const suffix = `share-ui-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const tobiasContext = await browser.newContext({ storageState: tobias.storageState });
  const lenaContext = await browser.newContext({ storageState: lena.storageState });

  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Haushalt ${suffix}`, description: "", icon: "building-2" },
      { api: tobias.api },
    );
    const lenaPage = await pageFor(lenaContext, workspace.id);
    await expect(lenaPage.getByTestId("workspace-no-access")).toContainText(
      "Kein Zugriff auf diesen Arbeitsbereich",
    );

    const tobiasPage = await pageFor(tobiasContext, workspace.id);
    await expect(tobiasPage.getByTestId("workspace-access-badge")).toHaveText(
      "Ihr Arbeitsbereich",
    );
    await expect(tobiasPage.getByTestId("workspace-members")).toHaveText(
      "1 Mitglied",
    );
    await tobiasPage.getByTestId("workspace-members").click();
    const dialog = tobiasPage.getByTestId("workspace-members-dialog");
    await expect(dialog).toContainText(`Mitglieder von „Haushalt ${suffix}“`);
    await dialog.getByTestId("share-picker-input").fill(`${suffix}-lena`);
    await tobiasPage.getByTestId(`share-option-${lena.id}`).click();
    await dialog.getByTestId("share-picker-invite").click();
    await expect(
      tobiasPage.locator('[data-sonner-toast][data-type="success"]'),
    ).toContainText(`Eingeladen. „Haushalt ${suffix}“ ist jetzt geteilt.`);
    await expect(dialog.getByTestId(`member-row-${lena.id}`)).toContainText(
      "Ohne Team",
    );

    await lenaPage.goto(`/workspaces/${workspace.id}?tab=instructions`);
    await expect(lenaPage.getByTestId("workspace-access-badge")).toHaveText(
      "Sie können verwenden",
    );
    await expect(lenaPage.getByTestId("workspace-instruction-save")).toHaveCount(0);
    await lenaPage.goto(`/workspaces/${workspace.id}?tab=skills`);
    await expect(lenaPage.getByTestId("workspace-skill-add-menu")).toHaveCount(0);

    await dialog.getByTestId(`member-level-${lena.id}`).click();
    await tobiasPage.getByRole("option", { name: /Kann bearbeiten/ }).click();
    await expect(dialog.getByTestId(`member-level-${lena.id}`)).toContainText(
      "Kann bearbeiten",
    );
    await lenaPage.reload();
    await expect(lenaPage.getByTestId("workspace-access-badge")).toHaveText(
      "Sie können bearbeiten",
    );
    await expect(lenaPage.getByTestId("workspace-skill-add-menu")).toBeVisible();

    await dialog.getByTestId(`member-remove-${lena.id}`).click();
    await expect(dialog.getByTestId(`member-row-${lena.id}`)).toHaveCount(0);
    await lenaPage.reload();
    await expect(lenaPage.getByTestId("workspace-no-access")).toBeVisible();
  } finally {
    await tobiasContext.close();
    await lenaContext.close();
    for (const member of [tobias, lena]) {
      await generatedApi.userControllerDeleteUser(member.id, { api });
      await member.api.dispose();
    }
  }
});

test("an owner ends a team share in the members dialog", async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(180_000);
  const suffix = `share-ui-team-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const team = await createTeam(api, `Bauamt ${suffix}`);
  const tobiasContext = await browser.newContext({ storageState: tobias.storageState });
  const lenaContext = await browser.newContext({ storageState: lena.storageState });

  try {
    await addTeamMember(api, team.id, lena.id);
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Bauleitplanung ${suffix}`, description: "", icon: "building-2" },
      { api: tobias.api },
    );
    await requestShare(tobias.api, workspace.id, { teamIds: [team.id], accessLevel: "use" });

    const tobiasPage = await pageFor(tobiasContext, workspace.id);
    await tobiasPage.getByTestId("workspace-members").click();
    const dialog = tobiasPage.getByTestId("workspace-members-dialog");
    await dialog.getByTestId(`end-team-sharing-${team.id}`).click();
    await tobiasPage.getByTestId("confirmation-confirm").click();
    await expect(dialog.getByTestId(`end-team-sharing-${team.id}`)).toHaveCount(0);
    await expect(dialog.getByTestId(`member-row-${lena.id}`)).toHaveCount(0);

    const lenaPage = await pageFor(lenaContext, workspace.id);
    await expect(lenaPage.getByTestId("workspace-no-access")).toBeVisible();
  } finally {
    await tobiasContext.close();
    await lenaContext.close();
    await deleteTeam(api, team.id);
    for (const member of [tobias, lena]) {
      await generatedApi.userControllerDeleteUser(member.id, { api });
      await member.api.dispose();
    }
  }
});
