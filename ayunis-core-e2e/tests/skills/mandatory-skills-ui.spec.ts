import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  requestCreateSkill,
  requestDeleteSkill,
} from '../../src/clients/api/owned-resources.client';
import { createSignedInMember } from '../../src/factories/user.factory';

async function idOf(response: { json: () => Promise<unknown> }) {
  return ((await response.json()) as { id: string }).id;
}

test('admins switch "Für alle verpflichtend" on and members see "Immer aktiv" instead of the switch', async ({
  api,
  mail,
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = `mandatory-ui-${Date.now()}`;
  const member = await createSignedInMember(api, mail, `${suffix}-lena`);
  const memberContext = await browser.newContext({
    storageState: member.storageState,
  });
  const memberPage = await memberContext.newPage();
  const skillId = await idOf(
    await requestCreateSkill(api, { ownerType: 'org' }, `Datenschutz ${suffix}`),
  );

  try {
    await memberPage.goto(`/skills/${skillId}`);
    await expect(memberPage.getByTestId('skill-detail-active')).toBeVisible();
    await expect(memberPage.getByTestId('skill-mandatory-control')).toHaveCount(0);

    await page.goto(`/skills/${skillId}`);
    await page.getByTestId('skill-mandatory-switch').click();
    await expect(page.getByTestId('skill-mandatory-switch')).toBeChecked();
    await expect(page.getByTestId('skill-detail-active-always')).toBeVisible();

    await memberPage.goto('/skills?tab=shared');
    await expect(
      memberPage.getByTestId(`skill-active-${skillId}-always`),
    ).toBeVisible();
    await memberPage.goto(`/skills/${skillId}`);
    await expect(memberPage.getByTestId('skill-detail-active-always')).toBeVisible();
    await expect(memberPage.getByTestId('skill-detail-active')).toHaveCount(0);
  } finally {
    await requestDeleteSkill(api, skillId);
    await memberContext.close();
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await member.api.dispose();
  }
});
