import { test, expect } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';

test('renders URL references in assistant chat and after reload', async ({ page }) => {
  const url = 'https://www.muenchen.de/rathaus?topic=city&lang=de#services';
  await startThread(page, `Name this chat {{url:${url}}}`);
  const reference = page.getByTestId('assistant-message').last().getByTestId('url-reference');
  await expect(reference).toHaveText('muenchen.de');
  await expect(reference).toHaveAttribute('href', url);
  await expect(reference).toHaveAttribute('target', '_blank');
  await expect(reference).toHaveAttribute('rel', 'noopener noreferrer');
  await page.reload();
  await expect(reference).toHaveAttribute('href', url);
});
