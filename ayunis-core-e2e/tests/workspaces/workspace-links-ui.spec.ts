import type { Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  requestCreateSkill,
  requestDeleteSkill,
} from "../../src/clients/api/owned-resources.client";
import { createSignedInMember } from "../../src/factories/user.factory";

async function openLinkPicker(page: Page, prefix: string) {
  await page.getByTestId(`${prefix}-add-menu`).click();
  await page.getByTestId(`${prefix}-link-existing`).click();
  const dialog = page.getByTestId("workspace-link-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("a workspace owner links own and organisation items, sees where they are linked and unlinks them", async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(180_000);
  const suffix = `links-ui-${Date.now()}`;
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const context = await browser.newContext({
    storageState: lena.storageState,
  });
  const page = await context.newPage();
  let orgSkillId = "";

  try {
    orgSkillId = (
      (await (
        await requestCreateSkill(api, { ownerType: "org" }, `Datenschutz ${suffix}`)
      ).json()) as { id: string }
    ).id;
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Haushalt ${suffix}`, description: "", icon: "building-2" },
      { api: lena.api },
    );
    const own = await generatedApi.skillsControllerCreate(
      {
        ownerType: "personal",
        name: `Protokoll ${suffix}`,
        shortDescription: "Fasst Besprechungen zusammen",
        instructions: "Fasse die Besprechung zusammen.",
      },
      { api: lena.api },
    );
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: "personal", name: `Satzungen ${suffix}`, description: "" },
      { api: lena.api },
    );

    await page.goto(`/workspaces/${workspace.id}?tab=skills`);
    const linkedSkills = page.getByTestId("workspace-linked-skill");
    await expect(linkedSkills).toContainText(
      "Noch keine verknüpften Fähigkeiten",
    );

    let dialog = await openLinkPicker(page, "workspace-skill");
    await expect(dialog).toContainText("Vorhandene Fähigkeiten verknüpfen");
    await expect(dialog).toContainText("Eigene");
    await expect(dialog).toContainText("Von der Organisation");
    await dialog.getByTestId("link-picker-search").fill(`Protokoll ${suffix}`);
    await expect(dialog.getByTestId(`link-picker-item-${orgSkillId}`)).toHaveCount(0);
    await dialog.getByTestId("link-picker-search").fill("");
    await dialog.getByTestId(`link-picker-item-${own.id}`).click();
    await dialog
      .getByTestId(`link-picker-item-${orgSkillId}`)
      .getByRole("checkbox")
      .click();
    await expect(dialog.getByTestId("link-picker-submit")).toHaveText(
      "2 verknüpfen",
    );
    await dialog.getByTestId("link-picker-submit").click();
    await expect(
      page.locator('[data-sonner-toast][data-type="success"]'),
    ).toContainText("Verknüpft.");
    await expect(dialog).toHaveCount(0);

    const ownRow = page.getByTestId(`workspace-linked-item-${own.id}`);
    await expect(ownRow).toContainText("Sie");
    await expect(
      page.getByTestId(`workspace-linked-item-${orgSkillId}`),
    ).toContainText("Organisation");
    await expect(page.getByTestId("workspace-tab-skills")).toContainText("2");
    await ownRow.getByTestId("linked-item-owner").hover();
    await expect(page.getByRole("tooltip")).toContainText("Gehört Ihnen");
    await expect(page.getByRole("tooltip")).toContainText("Verknüpft von Ihnen");

    await ownRow.click({ position: { x: 40, y: 20 } });
    await expect(page).toHaveURL(new RegExp(`/skills/${own.id}$`));
    await expect(page.getByTestId("linked-workspaces")).toContainText(
      workspace.name,
    );
    await page.getByTestId("skill-detail-delete").click();
    await expect(page.getByRole("dialog")).toContainText(
      "Sie ist in einem Arbeitsbereich verknüpft.",
    );
    await page.getByTestId("confirmation-cancel").click();

    await page.goto(`/workspaces/${workspace.id}?tab=skills`);
    await page.getByTestId(`workspace-unlink-${own.id}`).click();
    await expect(page.getByRole("dialog")).toContainText("Verknüpfung lösen?");
    await page.getByTestId("confirmation-confirm").click();
    await expect(
      page.locator('[data-sonner-toast][data-type="success"]'),
    ).toContainText(`„Protokoll ${suffix}“ ist nicht mehr verknüpft.`);
    await expect(page.getByTestId(`workspace-linked-item-${own.id}`)).toHaveCount(0);

    await page.getByTestId("workspace-tab-knowledge").click();
    dialog = await openLinkPicker(page, "workspace-knowledge");
    await expect(dialog).toContainText("Vorhandenes Wissen verknüpfen");
    await dialog.getByTestId(`link-picker-item-${knowledgeBase.id}`).click();
    await expect(dialog.getByTestId("link-picker-submit")).toHaveText(
      "Verknüpfen",
    );
    await dialog.getByTestId("link-picker-submit").click();
    await expect(
      page.getByTestId(`workspace-linked-item-${knowledgeBase.id}`),
    ).toBeVisible();
    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
    await expect(page.getByTestId("linked-workspaces")).toContainText(
      workspace.name,
    );
  } finally {
    if (orgSkillId) await requestDeleteSkill(api, orgSkillId);
    await context.close();
    await generatedApi.userControllerDeleteUser(lena.id, { api });
    await lena.api.dispose();
  }
});
