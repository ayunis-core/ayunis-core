import { request as apiRequest } from '@playwright/test';
import type { Page } from '@playwright/test';
import { config } from '../../src/config';
import { test, expect } from '../../src/fixtures/test';
import {
  confirmAcademyChapter,
  enableAcademyForOrg,
  getAcademyAccessStatus,
  getAcademyChapters,
  getAcademyChapterWithModules,
  getAcademyProgress,
  requireAcademyCompletion,
  setAcademyMinimumModuleSeconds,
  stopRequiringAcademyCompletion,
} from '../../src/clients/api/academy.client';

// The minimum time per video page is one platform-wide setting; running these
// serially keeps each test's value from leaking into the other. The blocked
// path runs first: a chapter confirmed minutes ago is replayed rather than
// re-checked, so it must not follow the journey that confirms every chapter.
test.describe.configure({ mode: 'serial' });

// The worker org outlives this file; leaving chat gated behind the Academy
// would block members that later specs create in the same org.
test.afterAll(async ({ org }) => {
  const api = await apiRequest.newContext({
    baseURL: config.apiURL,
    storageState: org.storageState,
  });
  try {
    await stopRequiringAcademyCompletion(api);
  } finally {
    await api.dispose();
  }
});

test('blocks confirmation until every video page was open for the minimum time', async ({
  page,
  api,
  org,
}) => {
  await enableAcademyForOrg(org.orgId);
  await setAcademyMinimumModuleSeconds(1);

  const chapter = await getAcademyChapterWithModules(api);

  // The confirmation page can be opened directly; the server must refuse too.
  await page.goto(`/academy/${chapter.id}/complete`);
  const shortModules = page.getByTestId('academy-confirmation-short-modules');
  const watchedVideos = page.getByTestId('academy-confirmation-watched');
  const submit = page.getByTestId('academy-confirmation-submit');
  await expect(shortModules).toBeVisible();
  await expect(shortModules.getByRole('listitem')).toHaveCount(
    chapter.courseModules.length,
  );
  await watchedVideos.check();
  await expect(submit).toBeDisabled();
  await expect(confirmAcademyChapter(api, chapter.id)).rejects.toThrow(
    /HTTP 409/,
  );

  // The server measures real elapsed time between heartbeats, so the minimum
  // has to pass on each module page; leaving via in-app navigation sends the
  // closing heartbeat that credits it.
  const [firstModule, ...laterModules] = chapter.courseModules;
  await stayOnModulePage(page, firstModule.id, () =>
    page.goto(`/academy/${chapter.id}?module=0`),
  );
  for (const courseModule of laterModules) {
    await stayOnModulePage(page, courseModule.id, () =>
      page.getByTestId('academy-module-next').click(),
    );
  }
  await page.getByTestId('academy-chapter-complete-action').click();
  await watchedVideos.check();
  await expect(submit).toBeEnabled();
  await expect(shortModules).toHaveCount(0);

  await submit.click();
  await expect(page).toHaveURL(/\/academy$/);
  await expect(
    page.getByTestId(`academy-chapter-confirmed-${chapter.id}`),
  ).toBeVisible();
});

test('confirms every academy chapter and unlocks gated chat', async ({
  page,
  api,
  org,
}) => {
  await enableAcademyForOrg(org.orgId);
  await setAcademyMinimumModuleSeconds(0);
  await requireAcademyCompletion(api);

  const chapters = await getAcademyChapters(api);
  expect(chapters.length).toBeGreaterThan(0);
  expect((await getAcademyAccessStatus(api)).allowed).toBe(false);

  await page.goto('/chat');
  await page.getByTestId('input').fill('Blocked before Academy completion');
  await expect(page.getByTestId('send')).toBeDisabled();

  for (const chapter of chapters) {
    const lastModuleIndex = Math.max(chapter.courseModules.length - 1, 0);
    await page.goto(`/academy/${chapter.id}?module=${lastModuleIndex}`);
    await expect(page.getByTestId('academy-confirmation-page')).toHaveCount(0);

    await page.getByTestId('academy-chapter-complete-action').click();
    await expect(page).toHaveURL(
      new RegExp(`/academy/${chapter.id}/complete$`),
    );
    await expect(page.getByTestId('academy-confirmation-page')).toBeVisible();

    const watchedVideos = page.getByTestId('academy-confirmation-watched');
    const submit = page.getByTestId('academy-confirmation-submit');
    await expect(watchedVideos).not.toBeChecked();
    await expect(submit).toBeDisabled();

    await watchedVideos.check();
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page).toHaveURL(/\/academy$/);
    await expect(
      page.getByTestId(`academy-chapter-confirmed-${chapter.id}`),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId(`academy-chapter-confirmed-${chapter.id}`),
    ).toBeVisible();
  }

  await expect(page.getByTestId('academy-completed')).toBeVisible();
  const progress = await getAcademyProgress(api);
  expect(progress.chapters.every(({ confirmed }) => confirmed)).toBe(true);
  expect(progress.academyCompletedAt).not.toBeNull();
  expect((await getAcademyAccessStatus(api)).allowed).toBe(true);

  await page.goto('/chat');
  await page.getByTestId('input').fill('Available after Academy completion');
  await expect(page.getByTestId('send')).toBeEnabled();
});

async function stayOnModulePage(
  page: Page,
  courseModuleId: string,
  open: () => Promise<unknown>,
): Promise<void> {
  const sessionStarted = page.waitForResponse((response) =>
    response.url().endsWith(`/course-modules/${courseModuleId}/heartbeat`),
  );
  await open();
  await sessionStarted;
  const visibleSince = Date.now();
  await expect
    .poll(() => Date.now() - visibleSince, { intervals: [250] })
    .toBeGreaterThan(1_100);
}
