import { test, expect } from '../../src/fixtures/test';

test('names the academy training for organizations without the add-on', async ({
  page,
}) => {
  await page.goto('/academy');

  await expect(page.getByTestId('academy-placeholder')).toContainText(
    'KI-Schulung nach EU AI Act',
  );
});
