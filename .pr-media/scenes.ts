import { test } from '@playwright/test';
import type { PrMediaScene } from './types';
import {
  notifyingRoutine,
  unreadNotificationCount,
} from '../src/clients/api/notifications.client';
import {
  createRoutine,
  failingRoutine,
  getRoutine,
  runRoutineNow,
} from '../src/clients/api/routines.client';

export default [
  {
    name: 'new-chat-unread-panel',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      test.setTimeout(180_000);
      const api = page.request;
      if ((await unreadNotificationCount(api)).count === 0) {
        for (const subject of ['Gewerberecht', 'Bürgerbüro']) {
          const routine = await createRoutine(
            api,
            notifyingRoutine(`Amtsblatt ${subject}`, subject),
          );
          await runRoutineNow(api, routine.id);
          await expect
            .poll(async () => (await getRoutine(api, routine.id)).lastRunStatus, {
              timeout: 60_000,
            })
            .toBe('succeeded');
        }
        const failing = await createRoutine(api, failingRoutine('Pressespiegel'));
        await runRoutineNow(api, failing.id);
        await expect
          .poll(
            async () => (await getRoutine(api, failing.id)).consecutiveFailureCount,
            { timeout: 60_000 },
          )
          .toBe(1);
        await page.reload();
      }
      await expect(page.getByTestId('new-chat-unread-notification').first()).toBeVisible();
      return page.getByTestId('new-chat-unread-notifications');
    },
    demos: [
      {
        name: 'switch-tab',
        action: async ({ page }) => {
          await page
            .getByTestId('new-chat-unread-notifications-tab')
            .and(page.locator('[data-type="routine"]'))
            .click();
          await page.getByTestId('new-chat-unread-notification').first().hover();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
