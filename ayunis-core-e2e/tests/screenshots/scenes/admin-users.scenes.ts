import type { Page } from '@playwright/test';
import { delay } from '../lib/delay';
import type { DemoScene } from './types';

export const adminUsersScenes: DemoScene[] = [
  { name: 'invite-menu', action: openInviteMenu },
  { name: 'invite-dialog', action: openInviteDialog },
];

async function openInviteMenu(page: Page): Promise<void> {
  await page.getByRole('button').last().click();
  await delay(900);
  await page.keyboard.press('Escape');
}

async function openInviteDialog(page: Page): Promise<void> {
  await page.getByRole('button').last().click();
  await page.getByRole('menuitem').first().click();
  await delay(900);
  await page.keyboard.press('Escape');
}
