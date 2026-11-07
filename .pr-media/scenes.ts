import type { Page } from '@playwright/test';
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

async function openRoutineThread(page: Page, name: string) {
  await page
    .getByTestId('chat')
    .filter({ has: page.getByTestId('chat-routine-icon') })
    .filter({ hasText: name })
    .first()
    .getByRole('link')
    .click();
}

export default [
  {
    name: 'routines-page',
    path: '/routines',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await createBlankRoutine(
        page,
        'Amtsblatt',
        'E2E finish routine: Amtsblatt der Stadt prüfen',
      );
      await runAndSettle(page, 'Amtsblatt', 'succeeded');
      await createBlankRoutine(
        page,
        'Ratsinformationen',
        'Prüfe das Ratsinformationssystem auf neue Sitzungsvorlagen.',
      );
      await runAndSettle(page, 'Ratsinformationen', 'failed');
      return page.getByTestId('routines-list');
    },
    demos: [
      {
        name: 'create-from-premade',
        action: async ({ page }) => {
          await page.getByTestId('create-routine-menu').first().click();
          await page
            .getByTestId('create-routine-premade-verkuendungsplattform')
            .click();
          await page.getByTestId('routine-form').waitFor();
        },
      },
    ],
  },
  {
    name: 'routine-thread-finished',
    path: '/routines',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await createBlankRoutine(
        page,
        'Bekanntmachungen',
        'E2E finish routine: Bekanntmachungen prüfen',
      );
      await runAndSettle(page, 'Bekanntmachungen', 'succeeded');
      await openRoutineThread(page, 'Bekanntmachungen');
      return page.getByTestId('routine-finished');
    },
  },
  {
    name: 'routine-thread-nudges',
    path: '/routines',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await createBlankRoutine(
        page,
        'Pressespiegel',
        'Fasse die heutigen Pressemitteilungen der Stadt zusammen.',
      );
      await runAndSettle(page, 'Pressespiegel', 'failed');
      await openRoutineThread(page, 'Pressespiegel');
      return page.getByTestId('routine-nudge').last();
    },
  },
] satisfies PrMediaScene[];
