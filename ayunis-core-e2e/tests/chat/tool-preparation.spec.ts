import { test, expect } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';

test('shows a tool while the model is still writing its arguments', async ({
  page,
}) => {
  await page.goto('/chat');
  await sendMessage(page, 'E2E trigger slow tool preparation');

  const step = page.getByTestId('agent-run-tool-step');
  await expect(step).toHaveAttribute('data-tool-name', 'create_document');
  await expect(step).toHaveAttribute('data-status', 'in_progress');

  await page.getByTestId('cancel').click();
  await expect(step).toHaveCount(0);
});
