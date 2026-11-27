import type { Page } from '@playwright/test';
import {
  createSuperAdminApi,
  saveAdventCalendarDoor,
  setAdventCalendarEnabled,
} from '../src/clients/api/advent-calendar.client';
import type { PrMediaScene } from './types';

// The CI backend's clock starts on 10 Dec 2026 (ADVENT_CALENDAR_NOW), so
// door 10 is today's door.
let setup: Promise<void> | undefined;

async function fillTodaysDoor(): Promise<void> {
  const api = await createSuperAdminApi();
  try {
    await setAdventCalendarEnabled(api, true);
    await saveAdventCalendarDoor(api, 10, {
      title: 'Fähigkeiten nutzen',
      body: 'Heute: **Fähigkeiten**.',
      buttons: [{ kind: 'link', label: 'Zu den Fähigkeiten', url: '/skills' }],
    });
  } finally {
    await api.dispose();
  }
}

async function showCard(page: Page) {
  setup ??= fillTodaysDoor();
  await setup;
  await page.reload();
  const card = page.getByTestId('new-chat-advent-calendar-card');
  await card.waitFor();
  // Let the new-chat entrance fade finish before the screenshot.
  await page
    .locator('.new-chat-compose__content')
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return card;
}

export default [
  {
    name: 'new-chat-advent-card',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: ({ page }) => showCard(page),
    demos: [
      {
        name: 'open-todays-door',
        action: async ({ page, expect }) => {
          await page.getByTestId('new-chat-advent-calendar-card').click();
          await expect(
            page.getByTestId('advent-calendar-door-dialog'),
          ).toBeVisible();
          await page.keyboard.press('Escape');
          await page.goto('/chat');
          await expect(page.getByTestId('new-chat-workspace-picker')).toBeVisible();
          await expect(
            page.getByTestId('new-chat-advent-calendar-card'),
          ).toHaveCount(0);
        },
      },
    ],
  },
] satisfies PrMediaScene[];
