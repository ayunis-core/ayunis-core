import { test, expect } from '../../src/fixtures/test';
import { loginAsSeededSuperAdmin } from '../../src/flows/super-admin.flow';

// The global whitelist is platform-wide state shared by all workers, so every
// run works with its own suffixed words.
test.use({ storageState: { cookies: [], origins: [] } });

test('super admin adds several comma-separated words at once and removes one', async ({
  page,
}) => {
  const suffix = Date.now();
  const multiWord = `E2E Wort ${suffix}`;
  const singleWord = `E2EWort${suffix}`;
  const laterWord = `E2ESpaeter${suffix}`;

  await loginAsSeededSuperAdmin(page, '/super-admin-settings/anonymization');

  const input = page.getByTestId('whitelist-word-input-person_name');
  const submit = page.getByTestId('whitelist-word-submit-person_name');
  const entries = page.getByTestId('whitelist-word-item');

  await input.fill(`${multiWord}, ${singleWord}`);
  await submit.click();

  // Only commas separate words, so the term containing a space stays one entry.
  await expect(entries.filter({ hasText: multiWord })).toHaveCount(1);
  await expect(entries.filter({ hasText: singleWord })).toHaveCount(1);
  await expect(input).toHaveValue('');

  // A word that is already on the list must not stop the new one.
  await input.fill(`${singleWord}, ${laterWord}`);
  await submit.click();

  await expect(entries.filter({ hasText: laterWord })).toHaveCount(1);
  await expect(entries.filter({ hasText: singleWord })).toHaveCount(1);

  await page.getByRole('button', { name: new RegExp(singleWord) }).click();

  await expect(entries.filter({ hasText: singleWord })).toHaveCount(0);
  await expect(entries.filter({ hasText: multiWord })).toHaveCount(1);
  await expect(entries.filter({ hasText: laterWord })).toHaveCount(1);
});
