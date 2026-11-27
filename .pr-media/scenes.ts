import type { Page } from '@playwright/test';
import {
  createSuperAdminApi,
  saveAdventCalendarDoor,
  setAdventCalendarEnabled,
} from '../src/clients/api/advent-calendar.client';
import type { PrMediaContext, PrMediaScene } from './types';

// CI runs the backend with ADVENT_CALENDAR_NOW=2026-12-10T09:00:00+01:00:
// doors 1–10 are due (10 is today), door 11 shows the live countdown.
const FILLED_DOORS = [1, 2, 3, 4, 5, 6, 8, 9, 10];
const OPENED_DOORS = [1, 2, 3, 5];

async function fillCalendar(): Promise<void> {
  const superAdminApi = await createSuperAdminApi();
  try {
    await setAdventCalendarEnabled(superAdminApi, true);
    for (const day of FILLED_DOORS) {
      await saveAdventCalendarDoor(superAdminApi, day, {
        title: `Türchen ${day}: Prompts kennenlernen`,
        body: 'Heute lernen Sie **Prompts** kennen.',
        buttons: [
          { kind: 'prompt', label: 'Ausprobieren', prompt: 'Schreibe ein Gedicht' },
        ],
      });
    }
  } finally {
    await superAdminApi.dispose();
  }
}

async function showCalendar(
  page: Page,
  options: { theme: 'light' | 'dark'; effects: 'on' | 'off' },
) {
  await fillCalendar();
  await page.evaluate(
    ({ theme, effects, opened }) => {
      localStorage.setItem('ayunis-theme', theme);
      localStorage.setItem('advent_calendar_effects', effects);
      for (const day of opened) {
        localStorage.setItem(`advent_calendar_opened:2026:${day}`, '1');
      }
    },
    { ...options, opened: OPENED_DOORS },
  );
  await page.reload();
  return page.getByTestId('advent-calendar-scene');
}

async function swingsAjar(
  { page, expect }: PrMediaContext,
  day: number,
): Promise<void> {
  await page.getByTestId(`advent-calendar-door-${day}`).hover();
  await expect
    .poll(() =>
      page
        .getByTestId(`advent-calendar-door-${day}`)
        .locator('.advent-calendar-door__leaf')
        .evaluate((leaf) => getComputedStyle(leaf).transform),
    )
    .not.toBe('none');
}

export default [
  {
    name: 'advent-calendar',
    path: '/advent-calendar',
    viewports: ['desktop'],
    waitFor: ({ page }) => showCalendar(page, { theme: 'light', effects: 'on' }),
    demos: [
      {
        name: 'hover-and-open-door',
        action: async (context) => {
          const { page, expect } = context;
          await swingsAjar(context, 9);
          await swingsAjar(context, 6);
          await page.getByTestId('advent-calendar-door-10').click();
          await expect(page.getByTestId('advent-calendar-door-dialog')).toBeVisible();
          await expect(page.locator('body > canvas')).toHaveCount(0, {
            timeout: 5000,
          });
        },
      },
    ],
  },
  {
    name: 'advent-calendar-mobile',
    path: '/advent-calendar',
    viewports: ['mobile'],
    waitFor: ({ page }) => showCalendar(page, { theme: 'light', effects: 'on' }),
  },
  {
    name: 'advent-calendar-dark',
    path: '/advent-calendar',
    viewports: ['desktop', 'mobile'],
    waitFor: ({ page }) => showCalendar(page, { theme: 'dark', effects: 'on' }),
  },
  {
    name: 'advent-calendar-effects-off',
    path: '/advent-calendar',
    viewports: ['desktop'],
    waitFor: ({ page }) => showCalendar(page, { theme: 'light', effects: 'off' }),
  },
] satisfies PrMediaScene[];
