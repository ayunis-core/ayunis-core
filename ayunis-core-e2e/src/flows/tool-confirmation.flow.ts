import type { Page } from '@playwright/test';

export function toolConfirmationCard(page: Page) {
  return page.getByTestId('tool-confirmation').last();
}

// Confirms the last card awaiting confirmation, only this time unless asked
// to always allow the tool.
export async function confirmToolCall(
  page: Page,
  { alwaysAllow = false }: { alwaysAllow?: boolean } = {},
): Promise<void> {
  await toolConfirmationCard(page)
    .getByTestId(
      alwaysAllow
        ? 'tool-confirmation-always-allow'
        : 'tool-confirmation-allow-once',
    )
    .click();
}

export async function rejectToolCall(page: Page): Promise<void> {
  await toolConfirmationCard(page)
    .getByTestId('tool-confirmation-decline')
    .click();
}
