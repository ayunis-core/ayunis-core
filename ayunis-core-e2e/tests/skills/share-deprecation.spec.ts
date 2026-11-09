import { randomUUID } from "node:crypto";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  createOrgSkillShare,
  listSkillShares,
} from "../../src/clients/api/shares.client";
import { test, expect } from "../../src/fixtures/test";

test("the share tab no longer creates shares but still removes existing ones", async ({
  page,
  api,
}) => {
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: "personal",
      name: `Share deprecation ${randomUUID().slice(0, 8)}`,
      shortDescription: "Answers building permit questions",
      instructions: "Answer building permit questions.",
    },
    { api },
  );

  await page.goto(`/skills/${skill.id}?tab=share`);
  await expect(page.getByTestId("shares-deprecation-notice")).toBeVisible();
  const orgSwitch = page.getByTestId("shares-org-switch");
  await orgSwitch.click();
  await expect(page.getByTestId("shares-blocked-dialog")).toBeVisible();
  await page.getByTestId("shares-blocked-dialog-close").click();
  await expect(page.getByTestId("shares-blocked-dialog")).toBeHidden();
  await expect(orgSwitch).not.toBeChecked();
  expect(await listSkillShares(api, skill.id)).toEqual([]);

  await createOrgSkillShare(api, skill.id);
  await page.reload();
  await expect(orgSwitch).toBeChecked();
  await orgSwitch.click();
  await page.getByTestId("confirmation-confirm").click();
  await expect(orgSwitch).not.toBeChecked();
  await expect.poll(() => listSkillShares(api, skill.id)).toEqual([]);
});
