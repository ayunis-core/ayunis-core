import type { Page } from '@playwright/test';
import {
  listNotifications,
  notifyingRoutine,
} from '../src/clients/api/notifications.client';
import {
  createRoutine,
  failingRoutine,
  getRoutine,
  runRoutineNow,
} from '../src/clients/api/routines.client';
import type { PrMediaContext, PrMediaScene } from './types';

const SUBJECTS = ['Grundsteuer', 'Kitagebühren', 'Straßenreinigung'];

async function runToEnd(
  context: PrMediaContext,
  routineId: string,
): Promise<void> {
  const api = context.page.request;
  await runRoutineNow(api, routineId);
  await context
    .expect
    .poll(async () => (await getRoutine(api, routineId)).lastRunStatus, {
      timeout: 60_000,
    })
    .toMatch(/succeeded|failed/);
}

/** Seeds the worker org's inbox once and returns a routine notification id. */
async function seedInbox(context: PrMediaContext): Promise<string> {
  const api = context.page.request;
  if ((await listNotifications(api)).length < SUBJECTS.length) {
    const failing = await createRoutine(api, failingRoutine('Amtsblatt Kreis'));
    await runToEnd(context, failing.id);
    for (const subject of SUBJECTS) {
      const routine = await createRoutine(
        api,
        notifyingRoutine(`Amtsblatt ${subject}`, subject),
      );
      await runToEnd(context, routine.id);
    }
  }
  const notifications = await listNotifications(api, 'routine');
  return notifications[0].id;
}

async function openInbox(page: Page, path: string) {
  await page.goto(path);
  return page.getByTestId('inbox-list');
}

export default [
  {
    name: 'inbox-notification-open',
    path: '/inbox',
    viewports: ['desktop', 'mobile'],
    waitFor: async (context) => {
      const id = await seedInbox(context);
      await openInbox(context.page, `/inbox/${id}`);
      return context.page.getByTestId('notification-detail-headline');
    },
  },
  {
    name: 'inbox-nothing-open',
    path: '/inbox',
    viewports: ['desktop', 'mobile'],
    waitFor: async (context) => {
      await seedInbox(context);
      return openInbox(context.page, '/inbox');
    },
    demos: [
      {
        name: 'open-notifications',
        action: async ({ page, expect, viewport }) => {
          if (viewport !== 'desktop') return;
          const items = page.getByTestId('notification-item');
          for (const index of [0, 1, 2]) {
            await items.nth(index).getByTestId('notification-item-headline').click();
            await expect(items.nth(index)).toHaveAttribute('data-selected', 'true');
          }
        },
      },
    ],
  },
] satisfies PrMediaScene[];
