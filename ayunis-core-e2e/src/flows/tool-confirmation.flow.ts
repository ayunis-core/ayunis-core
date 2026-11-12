import type { Page } from '@playwright/test';

export function toolConfirmationCard(page: Page) {
  return page.getByTestId('tool-confirmation').last();
}

// Confirms the last card awaiting confirmation; ticks "Always allow" first
// when asked to.
export async function confirmToolCall(
  page: Page,
  { alwaysAllow = false }: { alwaysAllow?: boolean } = {},
): Promise<void> {
  const card = toolConfirmationCard(page);
  if (alwaysAllow) {
    await card.getByTestId('tool-confirmation-always-allow').check();
  }
  await card.getByTestId('tool-confirmation-confirm').click();
}

export async function rejectToolCall(page: Page): Promise<void> {
  await toolConfirmationCard(page)
    .getByTestId('tool-confirmation-reject')
    .click();
}
