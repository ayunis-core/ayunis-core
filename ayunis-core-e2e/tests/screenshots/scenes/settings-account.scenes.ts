import type { Page } from '@playwright/test';
import { delay } from '../lib/delay';
import type { DemoScene } from './types';

export const settingsAccountScenes: DemoScene[] = [
  { name: 'focus-name', action: focusFullName },
  { name: 'scroll-to-email', action: scrollToEmail },
];

async function focusFullName(page: Page): Promise<void> {
  await page.locator('#full-name').focus();
  await delay(800);
}

async function scrollToEmail(page: Page): Promise<void> {
  await page.locator('#email').scrollIntoViewIfNeeded();
  await delay(800);
}
