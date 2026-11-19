import type { Page } from '@playwright/test';

export function toolConfirmationCard(page: Page) {
  return page.getByTestId('tool-confirmation').last();
}

export async function confirmToolCall(
  page: Page,
  { alwaysAllow = false }: { alwaysAllow?: boolean } = {},
): Promise<void> {
  await toolConfirmationCard(page)
    .getByTestId(
      alwaysAllow
        ? 'tool-confirmation-always-allow'
        : 'tool-confirmation-confirm',
    )
    .click();
}

export async function rejectToolCall(page: Page): Promise<void> {
  await toolConfirmationCard(page)
    .getByTestId('tool-confirmation-reject')
    .click();
}
