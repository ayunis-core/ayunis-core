import { test, expect } from '../../src/fixtures/test';

test.use({
  permissions: ['clipboard-read', 'clipboard-write'],
});

test('undoes a paste in the chat input and keeps typed text', async ({
  page,
}) => {
  await page.goto('/chat');
  const input = page.getByTestId('input');
  await input.pressSequentially('Hello');
  await expect(input).toHaveValue('Hello');

  await page.evaluate(async () => {
    await navigator.clipboard.writeText(' 👋');
  });
  await input.press('ControlOrMeta+v');
  await expect(input).toHaveValue('Hello 👋');

  await input.press('ControlOrMeta+z');
  await expect(input).toHaveValue('Hello');
});
