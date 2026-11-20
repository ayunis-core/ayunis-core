import { readFile } from 'node:fs/promises';
import { test, expect } from '../../src/fixtures/test';

const letterheadsPath = '/api/letterheads';
const settingsPath = '/admin-settings/letterheads';
const pageSize = 10;

test('paginates letterheads across creation, navigation, and deletion', async ({
  page,
  api,
}) => {
  const response = await api.get(letterheadsPath);
  await expect(response).toBeOK();
  const existing = (await response.json()) as Array<{ name: string }>;
  const fullPages = Math.max(1, Math.ceil(existing.length / pageSize));
  const finalPage = fullPages + 1;
  const countToSeed = fullPages * pageSize - existing.length;
  const firstPagePdf = {
    name: 'sample-letterhead.pdf',
    mimeType: 'application/pdf',
    buffer: await readFile(
      new URL('../../fixtures/screenshot-record.pdf', import.meta.url),
    ),
  };
  const firstPageMargins = JSON.stringify({
    top: 45,
    bottom: 20,
    left: 25,
    right: 20,
  });
  const namePrefix = `Pagination fixture ${Date.now()}`;
  const names = Array.from(
    { length: countToSeed },
    (_, index) => `${namePrefix} ${index + 1}`,
  );
  const expectedNames = existing.map(({ name }) => name).concat(names);
  const createdIds: string[] = [];

  try {
    for (const name of names) {
      const creation = await api.post(letterheadsPath, {
        multipart: {
          name,
          firstPagePdf,
          firstPageMargins,
          continuationPageMargins: firstPageMargins,
        },
      });
      await expect(creation).toBeOK();
      const { id } = (await creation.json()) as { id: string };
      createdIds.push(id);
    }

    await page.goto(`${settingsPath}?page=${fullPages}`);
    const rows = page.getByTestId('letterheads-list-item');
    await expect(rows).toHaveCount(pageSize);
    await expect(rows.last()).toContainText(
      expectedNames[fullPages * pageSize - 1],
    );
    const next = page.getByRole('link', { name: 'Go to next page' });
    await expect(next).toHaveCount(Number(fullPages > 1));

    const newName = `${namePrefix} newest`;
    await page.getByTestId('letterheads-create').click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill(newName);
    await dialog
      .getByTestId('letterhead-first-page-file')
      .setInputFiles(firstPagePdf);
    const creating = page.waitForResponse(
      (result) =>
        result.url().endsWith(letterheadsPath) &&
        result.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: /^(Create|Erstellen)$/ }).click();
    const creation = await creating;
    expect(creation.status()).toBe(201);
    const { id } = (await creation.json()) as { id: string };
    createdIds.push(id);
    await expect(page).toHaveURL(`${settingsPath}?page=${finalPage}`);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(newName);

    await page.goBack();
    await expect(rows).toHaveCount(pageSize);
    await next.click();
    await page.reload();
    await expect(page).toHaveURL(`${settingsPath}?page=${finalPage}`);
    await expect(rows).toHaveCount(1);

    await page.goto(`${settingsPath}?page=${finalPage + 1}`);
    await expect(page).toHaveURL(`${settingsPath}?page=${finalPage}`);
    await expect(rows).toHaveCount(1);

    await rows.first().getByTestId('letterheads-delete').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /^(Delete|Löschen)$/ })
      .click();
    await expect(page).toHaveURL(`${settingsPath}?page=${fullPages}`);
    await expect(rows).toHaveCount(pageSize);
    await expect(next).toHaveCount(Number(fullPages > 1));
    createdIds.pop();
  } finally {
    await Promise.all(
      createdIds.map((id) => api.delete(`${letterheadsPath}/${id}`)),
    );
  }
});
