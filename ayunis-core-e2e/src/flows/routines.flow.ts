import type { Page } from '@playwright/test';

export function routineCard(page: Page, name: string) {
  // Routine names are user data, not translated copy.
  return page.getByTestId('routine-card').filter({
    has: page.getByTestId('routine-card-name').filter({ hasText: name }),
  });
}

export async function createBlankRoutine(
  page: Page,
  routine: { name: string; prompt: string },
): Promise<void> {
  await page.getByTestId('create-routine-menu').click();
  await page.getByTestId('create-routine-blank').click();
  await page.getByTestId('routine-form-name').fill(routine.name);
  await page.getByTestId('routine-form-prompt').fill(routine.prompt);
  await page.getByTestId('routine-form-submit').click();
}
