import { test, expect } from '../../src/fixtures/test';
import {
  enableAcademyForOrg,
  getAcademyAccessStatus,
  getAcademyChapters,
  getAcademyProgress,
  requireAcademyCompletion,
} from '../../src/clients/api/academy.client';

test('confirms every academy chapter and unlocks gated chat', async ({
  page,
  api,
  org,
}) => {
  await enableAcademyForOrg(org.orgId);
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
