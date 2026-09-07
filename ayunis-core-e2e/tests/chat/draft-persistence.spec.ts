import { test, expect } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';

test('restores an unsent prompt after navigating away from a chat', async ({
  page,
}) => {
  const firstThreadId = await startThread(page, 'First draft thread');
  const secondThreadId = await startThread(page, 'Second draft thread');

  await page.goto(`/chats/${firstThreadId}`);
  await page.getByTestId('input').fill('Unsent draft prompt');

  await page.goto(`/chats/${secondThreadId}`);
  await expect(page.getByTestId('input')).toHaveValue('');

  await page.goto(`/chats/${firstThreadId}`);
  const restoredInput = page.getByTestId('input');
  await expect(restoredInput).toHaveValue('Unsent draft prompt');
  await expect(restoredInput).toBeFocused();
  expect(
    await restoredInput.evaluate(
      (input) => (input as HTMLTextAreaElement).selectionStart,
    ),
  ).toBe('Unsent draft prompt'.length);
});
