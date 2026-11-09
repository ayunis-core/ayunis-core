import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';

export function routineCard(page: Page, name: string) {
  // Routine names are user data, not translated copy.
  return page.getByTestId('routine-card').filter({
    has: page.getByTestId('routine-card-name').filter({ hasText: name }),
  });
}

const ROUTINE_PAGE_URL = /\/routines\/([0-9a-f-]{36})/;

/** Creates a routine from the blank dialog, which opens its page. Returns its id. */
export async function createBlankRoutine(
  page: Page,
  routine: { name: string; prompt: string; integrationIds?: string[] },
): Promise<string> {
  await page.getByTestId('create-routine-menu').click();
  await page.getByTestId('create-routine-blank').click();
  await page.getByTestId('routine-form-name').fill(routine.name);
  await page.getByTestId('routine-form-prompt').fill(routine.prompt);
  for (const integrationId of routine.integrationIds ?? []) {
    await page.getByTestId(`routine-form-integration-${integrationId}`).click();
  }
  await page.getByTestId('routine-form-submit').click();
  await expect(page).toHaveURL(ROUTINE_PAGE_URL);
  await expect(page.getByTestId('routine-detail')).toBeVisible();
  return ROUTINE_PAGE_URL.exec(page.url())?.[1] ?? '';
}
