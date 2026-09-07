import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';

export type CreditLimitTarget = 'teams' | 'users';

export async function openCreditLimitDialog(
  page: Page,
  target: CreditLimitTarget,
  id: string,
  search: string,
): Promise<void> {
  await page.goto('/admin-settings/credit-limits');
  await page.getByTestId(`credit-limits-${target}-tab`).click();
  await page.getByTestId('credit-limits-search').fill(search);
  const kind = target === 'teams' ? 'team' : 'user';
  await page.getByTestId(`credit-limits-${kind}-${id}`).click();
  await expect(page.getByTestId('credit-limit-dialog')).toBeVisible();
}

export async function saveCreditLimit(
  page: Page,
  credits: number,
): Promise<void> {
  await page.getByTestId('credit-limit-input').fill(String(credits));
  await page.getByTestId('credit-limit-save').click();
  await expect(page.getByTestId('credit-limit-dialog')).toHaveCount(0);
}

export async function removeCreditLimit(page: Page): Promise<void> {
  await page.getByTestId('credit-limit-remove').click();
  await expect(page.getByTestId('credit-limit-dialog')).toHaveCount(0);
}
