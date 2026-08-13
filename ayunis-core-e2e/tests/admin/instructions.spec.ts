import { getOrgChatSettings } from '../../src/clients/api/org-chat-settings.client';
import { test, expect } from '../../src/fixtures/test';

// Admin settings happy path: flip the org internet-access switch and assert
// the setting persisted through the API. The switch is inverted relative to
// the setting: checked = internet access disabled.
test('toggles org internet access from admin settings', async ({
  page,
  api,
}) => {
  const readSetting = async (): Promise<boolean> =>
    (await getOrgChatSettings(api)).internetSearchEnabled;
  const before = await readSetting();

  await page.goto('/admin-settings/instructions');
  await page.locator('#disable-internet-access-switch').click();

  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toBeVisible();
  await expect.poll(readSetting).toBe(!before);
});
