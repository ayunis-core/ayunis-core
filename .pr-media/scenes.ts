import type { Expect, Page } from '@playwright/test';
import type { PrMediaScene } from './types';

async function createBlankRoutine(page: Page, name: string, prompt: string) {
  await page.getByTestId('create-routine-menu').first().click();
  await page.getByTestId('create-routine-blank').click();
  await page.getByTestId('routine-form-name').fill(name);
  await page.getByTestId('routine-form-prompt').fill(prompt);
  await page.getByTestId('routine-form-submit').click();
  await page.getByTestId('routine-form').waitFor({ state: 'detached' });
}

function card(page: Page, name: string) {
  return page.getByTestId('routine-card').filter({
    has: page.getByTestId('routine-card-name').filter({ hasText: name }),
  });
}

async function runAndSettle(page: Page, name: string, status: string) {
  await card(page, name).getByTestId('routine-card-run-now').click();
  await card(page, name)
    .locator(`[data-testid="routine-status"][data-status="${status}"]`)
    .waitFor({ timeout: 60_000 });
}

function inboxItem(page: Page, headline: string) {
  return page.getByTestId('notification-item').filter({
    has: page
      .getByTestId('notification-item-headline')
      .filter({ hasText: headline }),
  });
}

async function openInbox(page: Page, expect: Expect) {
  await page.getByTestId('sidebar-navigation-inbox').click();
  await page.getByTestId('inbox-list').waitFor();
  // The Run now toasts would cover the list.
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 15_000,
  });
}

export default [
  {
    name: 'inbox',
    path: '/routines',
    viewports: ['desktop'],
    waitFor: async ({ page, expect }) => {
      await createBlankRoutine(
        page,
        'Ratsinformationen',
        'Prüfe das Ratsinformationssystem auf neue Sitzungsvorlagen.',
      );
      await runAndSettle(page, 'Ratsinformationen', 'failed');
      await createBlankRoutine(
        page,
        'Verkündungsplattform',
        'E2E notify routine: Grundsteuer-Hebesätze 2027',
      );
      await runAndSettle(page, 'Verkündungsplattform', 'succeeded');
      await openInbox(page, expect);
      return page.getByTestId('inbox-list');
    },
  },
  {
    name: 'notification-detail',
    path: '/routines',
    viewports: ['desktop'],
    waitFor: async ({ page, expect }) => {
      await createBlankRoutine(
        page,
        'Amtsblatt',
        'E2E notify routine: Hundesteuersatzung',
      );
      await runAndSettle(page, 'Amtsblatt', 'succeeded');
      await openInbox(page, expect);
      await inboxItem(page, 'Neue Verordnung: Hundesteuersatzung').click();
      return page.getByTestId('notification-chat-about-this');
    },
    demos: [
      {
        name: 'chat-about-this',
        action: async ({ page }) => {
          await page.getByTestId('notification-chat-about-this').click();
          await page.getByTestId('new-chat-source-notification').waitFor();
          await page.getByTestId('input').fill('E2E quote notification');
          await page.getByTestId('send').click();
          await page.getByTestId('assistant-message').last().waitFor();
          await page.getByTestId('chat-source-notification').waitFor();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
