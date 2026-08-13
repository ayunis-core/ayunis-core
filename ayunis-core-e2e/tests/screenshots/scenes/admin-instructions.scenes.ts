import type { Page } from '@playwright/test';
import { delay } from '../lib/delay';
import type { DemoScene } from './types';

export const adminInstructionsScenes: DemoScene[] = [
  { name: 'edit-prompt', action: editOrgPrompt },
  { name: 'scroll-to-toggle', action: scrollToInternetToggle },
];

async function editOrgPrompt(page: Page): Promise<void> {
  await page.locator('#org-system-prompt-textarea').fill('Kurzer Video-Check');
  await delay(800);
}

async function scrollToInternetToggle(page: Page): Promise<void> {
  await page.locator('#disable-internet-access-switch').scrollIntoViewIfNeeded();
  await delay(800);
}
